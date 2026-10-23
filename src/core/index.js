import './compat.js'; // vá tính năng cho trình duyệt cũ — phải nạp trước mọi thứ
export { loadJSON } from './data.js';
export { startLoop } from './loop.js';
export { createScreen } from './screen.js';
export { createCamera, followCamera } from './camera.js';
export { createInput, drawStick } from './input.js';
export { createSaver, sha256 } from './saver.js';
export { compactNum, compactText } from './format.js';
export { lowEnd } from './device.js';
