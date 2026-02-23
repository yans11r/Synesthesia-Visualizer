let mic;
let fft;
let particles = [];
let song;
let uploadBtn;

// 颜色盘与背景变量
let themeColorPicker; 
let bgColorPicker;    
let bgImg = null;     // 用于存储用户上传的背景图

// 【新增】音量控制滑块
let volumeSlider;

// 用于控制自适应范围
let dynamicLimit = 40; 
let targetLimit = 40;  

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  
  // === 音频初始化 ===
  mic = new p5.AudioIn();
  mic.start();
  
  fft = new p5.FFT(0.8, 128); 
  fft.setInput(mic);
  
  // === UI 样式注入 ===
  // 强制取色器变成完美的圆形，并美化音量滑块
  let css = `
    input[type="color"] {
      -webkit-appearance: none;
      border: none;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      overflow: hidden;
      cursor: pointer;
      padding: 0;
      box-shadow: 0 0 10px rgba(0, 243, 255, 0.5);
      background: none;
    }
    input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
    input[type="color"]::-webkit-color-swatch { border: none; border-radius: 50%; }
    
    /* 赛博朋克风格音量滑块 */
    input[type="range"] {
      -webkit-appearance: none;
      width: 100px;
      background: transparent;
    }
    input[type="range"]:focus { outline: none; }
    input[type="range"]::-webkit-slider-runnable-track {
      width: 100%;
      height: 4px;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
    }
    input[type="range"]::-webkit-slider-thumb {
      height: 12px;
      width: 12px;
      border-radius: 50%;
      background: #00f3ff;
      cursor: pointer;
      -webkit-appearance: none;
      margin-top: -4px;
      box-shadow: 0 0 8px #00f3ff;
    }
  `;
  createElement('style', css); 
  
  // === 1. 上传按钮 ===
  uploadBtn = createFileInput(handleFile);
  uploadBtn.position(20, 20);
  uploadBtn.style('background-color', 'rgba(0,0,0,0.8)'); 
  uploadBtn.style('color', '#00f3ff');            
  uploadBtn.style('border', '1px solid #00f3ff'); 
  uploadBtn.style('padding', '8px 15px');         
  uploadBtn.style('font-family', 'Courier New');  
  uploadBtn.style('font-size', '12px');
  uploadBtn.style('cursor', 'pointer');           
  uploadBtn.style('box-shadow', '0 0 8px rgba(0, 243, 255, 0.3)'); 
  
  // === 2. 主题色盘 (左) ===
  themeColorPicker = createColorPicker('#00f3ff'); 
  themeColorPicker.position(20, 65);
  
  // === 3. 背景色盘 (中) ===
  bgColorPicker = createColorPicker('#0A0A0F'); 
  bgColorPicker.position(65, 65);
  
  // === 4. 【新增】音量控制滑块 (右) ===
  // createSlider(最小值, 最大值, 默认值, 步长)
  volumeSlider = createSlider(0, 1, 0.5, 0.01); 
  volumeSlider.position(115, 70); 
  
  // === 5. 系统提示词 ===
  let hint = createP('SYSTEM: Upload MP3/Img | Theme | BG | Volume');
  hint.position(20, 95); 
  hint.style('color', '#888');
  hint.style('font-family', 'Courier New');
  hint.style('font-size', '10px');
}

function handleFile(file) {
  if (file.type === 'audio') {
    if (song) song.stop();
    song = loadSound(file.data, () => {
      song.play();
      fft.setInput(song);
      mic.stop();
    });
  } else if (file.type === 'image') {
    bgImg = loadImage(file.data); 
  } else {
    alert("Please upload an MP3 audio or an Image (JPG/PNG)!");
  }
}

function draw() {
  // === 【核心逻辑】全局音量控制 ===
  let currentVolume = volumeSlider.value();
  outputVolume(currentVolume); // 这行代码会自动控制所有声音（包括麦克风和MP3）的输出音量
  
  // === 背景与底色渲染逻辑 ===
  let bgColor = bgColorPicker.color();
  let bgR = bgColor.levels[0];
  let bgG = bgColor.levels[1];
  let bgB = bgColor.levels[2];

  if (bgImg) {
    image(bgImg, 0, 0, width, height); 
    push();
    noStroke();
    fill(bgR, bgG, bgB, 180); 
    rect(0, 0, width, height);
    pop();
  } else {
    background(bgR, bgG, bgB, 40); 
  }

  let spectrum = fft.analyze(); 
  let bassEnergy = fft.getEnergy("bass");
  let vol = map(bassEnergy, 0, 255, 0, 1);
  
  // === 主题渐变色生成逻辑 ===
  let primaryColor = themeColorPicker.color();
  colorMode(HSB, 360, 100, 100);
  let h = hue(primaryColor);
  let s = saturation(primaryColor);
  let b = brightness(primaryColor);
  let c1 = color(h, s, b);
  let c2 = color((h + 60) % 360, s, b); 
  colorMode(RGB, 255); 
  
  // UI 同步更新主题色
  let hexColor = primaryColor.toString('#rrggbb');
  uploadBtn.style('color', hexColor);            
  uploadBtn.style('border', `1px solid ${hexColor}`); 
  uploadBtn.style('box-shadow', `0 0 8px ${hexColor}`);

  // 自适应算法
  let maxActiveIndex = 30; 
  for (let i = 80; i > 30; i--) {
    if (spectrum[i] > 50) { 
      maxActiveIndex = i;
      break; 
    }
  }
  
  if (maxActiveIndex > targetLimit) {
      targetLimit = lerp(targetLimit, maxActiveIndex, 0.05); 
  } else {
      targetLimit = lerp(targetLimit, maxActiveIndex, 0.02); 
  }
  dynamicLimit = targetLimit;

  translate(width / 2, height / 2);
  rotate(frameCount * 0.1); 
  
  noFill();
  stroke(bgR + 20, bgG + 20, bgB + 20); 
  strokeWeight(2);
  ellipse(0, 0, 200, 200);
  stroke(bgR + 30, bgG + 30, bgB + 30);
  ellipse(0, 0, 500, 500);
  
  let barsCount = floor(dynamicLimit); 
  strokeCap(SQUARE);
  
  for (let i = 0; i < barsCount; i++) {
    let amp = spectrum[i];
    let angle = map(i, 0, barsCount, 0, 180);
    let r = map(pow(amp, 0.8), 0, 100, 100, 380); 
    
    let colorPos = map(i, 0, barsCount, 0, 1);
    let c = lerpColor(c1, c2, colorPos);
    stroke(c);
    strokeWeight(map(barsCount, 30, 80, 5, 2)); 
    
    push();
    rotate(angle);
    line(100, 0, r, 0); 
    pop();
    
    push();
    rotate(angle + 180);
    line(100, 0, r, 0);
    pop();
  }
  
  blendMode(ADD);
  noStroke();
  fill(primaryColor.levels[0], primaryColor.levels[1], primaryColor.levels[2], 50);
  let coreSize = map(vol, 0, 1, 50, 90);
  ellipse(0, 0, coreSize, coreSize);
  
  push();
  rotate(-frameCount * 0.5);
  noFill();
  stroke(c2);
  strokeWeight(1);
  triangle(0, -60, -50, 30, 50, 30);
  pop();
  
  blendMode(BLEND);

  if (vol > 0.4) {
    let p = new Particle(primaryColor); 
    particles.push(p);
  }
  
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].show();
    if (particles[i].finished()) {
      particles.splice(i, 1);
    }
  }
}

class Particle {
  constructor(baseColor) {
    this.pos = p5.Vector.random2D().mult(random(100, 250)); 
    this.vel = this.pos.copy().normalize().mult(random(2, 5)); 
    this.alpha = 255;
    this.color = random(1) > 0.5 ? baseColor : color(255, 255, 255);
    this.w = random(1, 3);
  }
  update() {
    this.pos.add(this.vel);
    this.alpha -= 5; 
  }
  finished() { return this.alpha < 0; }
  show() {
    noStroke();
    fill(this.color.levels[0], this.color.levels[1], this.color.levels[2], this.alpha);
    ellipse(this.pos.x, this.pos.y, this.w);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}