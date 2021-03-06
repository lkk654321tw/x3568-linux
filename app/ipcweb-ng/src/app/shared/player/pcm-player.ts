export default class PCMPlayer {
  option: {
    encoding: string;
    channels: number;
    sampleRate: number;
    flushingTime: number;
  };
  samples: Float32Array;
  interval: NodeJS.Timer;
  maxValue: number;
  typedArray: any;
  audioCtx: any;
  gainNode: GainNode;
  startTime: number;

  constructor(option) {
    this.init(option);
  }

  init(option) {
    let defaults = {
      encoding: '16bitInt',
      channels: 1,
      sampleRate: 8000,
      flushingTime: 1000
    };
    this.option = Object.assign({}, defaults, option);
    this.samples = new Float32Array();
    this.flush = this.flush.bind(this);
    this.interval = setInterval(this.flush, this.option.flushingTime);
    this.maxValue = this.getMaxValue();
    this.typedArray = this.getTypedArray();
    this.createContext();
  }

  getMaxValue(): number {
    let encodings = {
      '8bitInt': 128,
      '16bitInt': 32768,
      '32bitInt': 2147483648,
      '32bitFloat': 1
    }

    return encodings[this.option.encoding] ? encodings[this.option.encoding] : encodings['16bitInt'];
  }

  getTypedArray(): TypedArray {
    let typedArrays = {
      '8bitInt': Int8Array,
      '16bitInt': Int16Array,
      '32bitInt': Int32Array,
      '32bitFloat': Float32Array
    }

    return typedArrays[this.option.encoding] ? typedArrays[this.option.encoding] : typedArrays['16bitInt'];
  }

  createContext() {
    this.audioCtx = new (window['AudioContext'] || window['webkitAudioContext'])();
    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.value = 1;
    this.gainNode.connect(this.audioCtx.destination);
    this.startTime = this.audioCtx.currentTime;
  }

  isTypedArray(data: any) {
    return (data.byteLength && data.buffer && data.buffer.constructor == ArrayBuffer);
  }

  feed(data: TypedArray) {
    if (!this.isTypedArray(data)) {return; }
    data = this.getFormatedValue(data);
    let tmp = new Float32Array(this.samples.length + data.length);
    tmp.set(this.samples, 0);
    tmp.set(data, this.samples.length);
    this.samples = tmp;
  }

  getFormatedValue(data: TypedArray): Float32Array {
    let data1: TypedArray = new this.typedArray(data.buffer);
    let float32: Float32Array = new Float32Array(data1.length);
    let i: number;

    for (i = 0; i < data1.length; i++) {
      float32[i] = data1[i] / this.maxValue;
    }
    return float32;
  }

  volume(volume: number) {
    this.gainNode.gain.value = volume;
  }

  destroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.samples = null;
    this.audioCtx.close();
    this.audioCtx = null;
  }

  flush() {
    if (!this.samples.length) {return; }
    const bufferSource: AudioBufferSourceNode = this.audioCtx.createBufferSource();
    const length: number = this.samples.length / this.option.channels;
    const audioBuffer: AudioBuffer = this.audioCtx.createBuffer(this.option.channels, length, this.option.sampleRate);
    let audioData: Float32Array;
    let channel: number;
    let offset: number;
    let i: number;
    let decrement: number;

    for (channel = 0; channel < this.option.channels; channel++) {
      audioData = audioBuffer.getChannelData(channel);
      offset = channel;
      decrement = 50;
      for (i = 0; i < length; i++) {
        audioData[i] = this.samples[offset];
        /* fadein */
        if (i < 50) {
          audioData[i] = (audioData[i] * i) / 50;
        }
        /* fadeout*/
        if (i >= (length - 51)) {
          audioData[i] = (audioData[i] * decrement--) / 50;
        }
        offset += this.option.channels;
      }
    }

    if (this.startTime < this.audioCtx.currentTime) {
      this.startTime = this.audioCtx.currentTime;
    }
    // console.log('start vs current '+this.startTime+' vs '+this.audioCtx.currentTime+' duration: '+audioBuffer.duration);
    bufferSource.buffer = audioBuffer;
    bufferSource.connect(this.gainNode);
    bufferSource.start(this.startTime);
    this.startTime += audioBuffer.duration;
    this.samples = new Float32Array();
  }

  getTimestamp() {
    if (this.audioCtx) {
      return this.audioCtx.currentTime;
    } else {
      return 0;
    }
  }

  play(data) {
    if (!this.isTypedArray(data)) {
      return;
    }

    data = this.getFormatedValue(data);
    if (!data.length) {
      return;
    }

    const bufferSource: AudioBufferSourceNode = this.audioCtx.createBufferSource();
    const length: number = data.length / this.option.channels;
    const audioBuffer: AudioBuffer = this.audioCtx.createBuffer(this.option.channels, length, this.option.sampleRate);
    let audioData: Float32Array;
    let channel: number;
    let offset: number;
    let i: number;
    let decrement: number;

    for (channel = 0; channel < this.option.channels; channel++) {
      audioData = audioBuffer.getChannelData(channel);
      offset = channel;
      decrement = 50;
      for (i = 0; i < length; i++) {
        audioData[i] = data[offset];
        /* fadein */
        if (i < 50) {
          audioData[i] = (audioData[i] * i) / 50;
        }
        /* fadeout*/
        if (i >= (length - 51)) {
          audioData[i] = (audioData[i] * decrement--) / 50;
        }
        offset += this.option.channels;
      }
    }

    if (this.startTime < this.audioCtx.currentTime) {
      this.startTime = this.audioCtx.currentTime;
    }
    // console.log('start vs current '+this.startTime+' vs '+this.audioCtx.currentTime+' duration: '+audioBuffer.duration);
    bufferSource.buffer = audioBuffer;
    bufferSource.connect(this.gainNode);
    bufferSource.start(this.startTime);
    this.startTime += audioBuffer.duration;
  }

  pause() {
    if (this.audioCtx.state === 'running') {
      this.audioCtx.suspend();
    }
  }

  resume() {
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

}
