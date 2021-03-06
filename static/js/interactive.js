class InteractiveCanvas {
  constructor (inputField, lineMargin, near, far, sampleName, hgType, hgFileDir) {
    this.inputField = inputField; // The canvas input field to display and fetch chromosome range from
    this.sampleName = sampleName; // File name to load data from
    this.hgType = hgType; // Whether to load HG37 or HG38, default is HG38
    this.hgFileDir = hgFileDir; // File directory

    // Plot variables
    this.titleMargin = 80; // Margin between plot and title
    this.legendMargin = 45; // Margin between legend and plot
    this.leftRightPadding = 2; // Padding for left and right in graph
    this.topBottomPadding = 8; // margin for top and bottom in graph
    this.plotWidth = Math.min(1500, 0.9 * document.body.clientWidth - this.legendMargin); // Width of one plot
    this.extraWidth = this.plotWidth / 1.5; // Width for loading in extra edge data
    this.plotHeight = 180; // Height of one plot
    this.x = document.body.clientWidth / 2 - this.plotWidth / 2; // X-position for first plot
    this.y = 10 + 2 * lineMargin + this.titleMargin; // Y-position for first plot
    this.canvasHeight = 2 + this.y + 2 * (this.leftRightPadding + this.plotHeight); // Height for whole canvas
    this.moveImg = null; // Holds a copy of latest drawn scene, used for dragging interactive canvas
    this.borderColor = '#666'; // Color of border
    this.titleColor = 'black'; // Color of titles/legends

    // BAF values
    this.baf = {
      yStart: 1.0, // Start value for y axis
      yEnd: 0.0, // End value for y axis
      step: 0.2, // Step value for drawing ticks along y-axis
      color: '#000000' // Viz color
    };

    // Log2 ratio values
    this.log2 = {
      yStart: 4.0, // Start value for y axis
      yEnd: -4.0, // End value for y axis
      step: 1.0, // Step value for drawing ticks along y-axis
      color: '#000000' // Viz color
    };

    // Setup draw canvas
    this.drawWidth = Math.max(this.plotWidth + 2 * this.extraWidth, document.body.clientWidth); // Draw-canvas width
    this.drawCanvas = new OffscreenCanvas(parseInt(this.drawWidth), parseInt(this.canvasHeight));
    this.context = this.drawCanvas.getContext('webgl2');

    // Setup visible canvases
    this.contentCanvas = document.getElementById('interactive-content');
    this.staticCanvas = document.getElementById('interactive-static');
    this.staticCanvas.width = this.contentCanvas.width = document.body.clientWidth;
    this.staticCanvas.height = this.contentCanvas.height = this.canvasHeight;

    // Setup loading div dimensions
    this.loadingDiv = document.getElementById("loading-div")
    this.loadingDiv.style.width = this.plotWidth+"px";
    this.loadingDiv.style.left = (1+this.x)+"px";
    this.loadingDiv.style.top = (32+1+this.y)+"px"; //32 is size of header bar.
    this.loadingDiv.style.height = (2*this.plotHeight)+"px";


    // State values
    const input = inputField.value.split(/:|-/);
    this.chromosome = input[0];
    this.start = input[1];
    this.end = input[2];
    this.allowDraw = true;

    // Listener values
    this.drag = false;
    this.dragStart;
    this.dragEnd;

    // Get chrosome dimensions
    $.getJSON($SCRIPT_ROOT + '/_overviewchromdim', {
      hg_type: this.hgType,
      x_pos: this.x,
      y_pos: this.y,
      full_plot_width: this.fullPlotWidth,
    }).done( (result) => {
      this.dims = result['chrom_dims'];
    });

    // WebGL scene variables
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(this.drawWidth / -2, this.drawWidth / 2,
      this.canvasHeight / -2, this.canvasHeight / 2, near, far);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.drawCanvas,
      context: this.context,
      antialiasing: true
    });

    // Change to fourth quadrant of scene
    this.camera.position.set(this.drawWidth / 2 - lineMargin,
      this.canvasHeight / 2 - lineMargin, 1);


    this.scale = this.calcScale();

    // Setup listeners
    this.contentCanvas.addEventListener('mousedown', (event) => {
      event.stopPropagation();
      if (!this.drag && this.allowDraw) {

        // Make sure scale factor is updated
        this.scale = this.calcScale();

        this.dragStart = {
          x: event.x,
          y: event.y
        };
        this.dragEnd = {
          x: event.x,
          y: event.y
        };

        // Set the boundaries of dragging (to avoid going outside of chrom)
        this.maxDrag = {
          up: (this.dims[this.chromosome].size - this.end) * this.scale,
          down: -this.start * this.scale
        }

        this.drag = true;
      }
    });


    // When in active dragging of the canvas
    this.contentCanvas.addEventListener('mousemove', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (this.drag) {
        this.dragEnd = {
          x: event.x,
          y: event.y
        };

        // Restrict dragging to chromosome boundaries.
        let dist = this.dragStart.x - this.dragEnd.x;
        if( dist < this.maxDrag.down ) {
          this.dragEnd.x = this.dragStart.x - this.maxDrag.down;
        }
        if( dist > this.maxDrag.up ) {
          this.dragEnd.x = this.dragStart.x - this.maxDrag.up;
        }

        // Clear whole content canvas
        this.contentCanvas.getContext('2d').clearRect(0,
          this.titleMargin / 2,
          this.contentCanvas.width,
          this.contentCanvas.height);

        // Copy draw image to content Canvas
        let lineMargin = 2;
        this.contentCanvas.getContext('2d').drawImage(this.moveImg,
          this.extraWidth - (this.dragEnd.x - this.dragStart.x),
          this.y + lineMargin,
          this.plotWidth + 2 * this.leftRightPadding,
          this.canvasHeight,
          this.x,
          this.y + lineMargin,
          this.plotWidth + 2 * this.leftRightPadding,
          this.canvasHeight);
      }
    });

    // When stop dragging
    this.contentCanvas.addEventListener('mouseup', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (this.drag) {
        this.drag = false;
        let moveDist = Math.floor((this.dragStart.x - this.dragEnd.x) / this.scale);

        // Do not allow negative values
        if (this.start + moveDist < 0) {
          moveDist -= (this.start + moveDist);
        }
        this.start += moveDist;
        this.end += moveDist;

        this.redraw(null);
      }
    });

    // Setup key down events to be handled by the key mapper
    document.addEventListener('DOMContentLoaded', () => {
      'use strict';

      const options = {
        eventType: 'keydown',
        keystrokeDelay: 1000
      };

      this.keyMapper(options);
    });
  }

  // Draw static content for interactive canvas
  drawStaticContent () {
    const linePadding = 2;
    const staticContext = this.staticCanvas.getContext('2d');

    // Fill background colour
    staticContext.fillStyle = 'white';
    staticContext.fillRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);

    // Make content area visible
    staticContext.clearRect(this.x + linePadding, this.y + linePadding,
      this.plotWidth, this.staticCanvas.height);
    staticContext.clearRect(0, 0, this.staticCanvas.width, this.y + linePadding);

    // Draw rotated y-axis legends
    drawRotatedText(this.staticCanvas, 'B Allele Freq', 18, this.x - this.legendMargin,
      this.y + this.plotHeight / 2, -Math.PI / 2, this.titleColor);
    drawRotatedText(this.staticCanvas, 'Log2 Ratio', 18, this.x - this.legendMargin,
      this.y + 1.5 * this.plotHeight, -Math.PI / 2, this.titleColor);

    // Draw BAF
    createGraph(this.scene, this.staticCanvas, this.x, this.y, this.plotWidth,
      this.plotHeight, this.topBottomPadding, this.baf.yStart, this.baf.yEnd,
      this.baf.step, true, this.borderColor);

    // Draw Log 2 ratio
    createGraph(this.scene, this.staticCanvas, this.x, this.y + this.plotHeight,
      this.plotWidth, this.plotHeight, this.topBottomPadding, this.log2.yStart,
      this.log2.yEnd, this.log2.step, true, this.borderColor);

    // Render scene
    this.renderer.render(this.scene, this.camera);

    // Transfer image to visible canvas
    staticContext.drawImage(this.drawCanvas.transferToImageBitmap(), 0, 0);

    // Clear scene for next render
    this.scene.remove.apply(this.scene, this.scene.children);
  }

  // Draw values for interactive canvas
  drawInteractiveContent () {
    this.loadingDiv.style.display = "block";
    console.time("getcoverage");

    $.getJSON($SCRIPT_ROOT + '/_getcoverage', {
      region: this.inputField.value,
      sample_name: this.sampleName,
      hg_type: this.hgType,
      hg_filedir: this.hgFileDir,
      xpos: this.extraWidth,
      ypos: this.y,
      plot_height: this.plotHeight,
      extra_plot_width: this.extraWidth,
      top_bottom_padding: this.topBottomPadding,
      x_ampl: this.plotWidth,
      baf_y_start: this.baf.yStart,
      baf_y_end: this.baf.yEnd,
      log2_y_start: this.log2.yStart,
      log2_y_end: this.log2.yEnd
    }, (result) => {

      console.timeEnd('getcoverage');
      // Clear canvas
      this.contentCanvas.getContext('2d').clearRect(0, 0,
        this.contentCanvas.width, this.contentCanvas.height);

      // Draw ticks for x-axis
      drawVerticalTicks(this.scene, this.contentCanvas, this.extraWidth, this.x,
        this.y, result['start'], result['end'], this.plotWidth, this.topBottomPadding,
        this.titleColor);

      // Draw horizontal lines for BAF and Log 2 ratio
      drawGraphLines(this.scene, 0, result['y_pos'],
        this.baf.yStart, this.baf.yEnd, this.baf.step, this.topBottomPadding,
        this.drawWidth, this.plotHeight);
      drawGraphLines(this.scene, 0, result['y_pos'] + this.plotHeight,
        this.log2.yStart, this.log2.yEnd, this.log2.step, this.topBottomPadding,
        this.drawWidth, this.plotHeight);

      // Plot scatter data
      drawData(this.scene, result['baf'], this.baf.color);
      drawData(this.scene, result['data'], this.log2.color);
      this.renderer.render(this.scene, this.camera);

      // Mark the location in the overview plot
      oc.markRegion(result['chrom'], result['start'], result['end']);

      // Draw chromosome title
      drawText(this.contentCanvas,
        document.body.clientWidth / 2,
        result['y_pos'] - this.titleMargin,
        'Chromosome ' + result['chrom'], 'bold 15', 'center');

      this.moveImg = this.drawCanvas.transferToImageBitmap();

      // Transfer image to visible canvas
      this.contentCanvas.getContext('2d').drawImage(this.moveImg,
        this.extraWidth, 0, this.plotWidth + 2 * this.leftRightPadding, this.canvasHeight,
        this.x, 0, this.plotWidth + 2 * this.leftRightPadding, this.canvasHeight);

      // Clear scene before drawing
      this.scene.remove.apply(this.scene, this.scene.children);
    }).done((result) => {

      this.loadingDiv.style.display = "none";

      // Set values
      this.chromosome = result['chrom'];
      this.start = result['start'];
      this.end = result['end'];
      this.inputField.value = this.chromosome + ':' + this.start + '-' + this.end;
      this.inputField.placeholder = this.inputField.value;
      this.allowDraw = true;
      this.inputField.blur();
    }).fail((result) => {
      this.allowDraw = true;

      // Signal bad input by adding error class
      this.inputField.classList.add('error');
      this.inputField.disabled = true;

      // Remove error class after a while
      setTimeout( () => {
        this.inputField.classList.remove('error');
        this.inputField.value = this.inputField.placeholder;
        this.inputField.disabled = false;
      }, 1500);
    });
  }

  // Redraw interactive canvas
  redraw (inputValue) {
    if (!this.allowDraw) {
      return;
    }
    this.allowDraw = false;

    // Set input field
    if (inputValue) {
      this.inputField.value = inputValue;
    } else {
      this.inputField.value = this.chromosome + ':' + this.start + '-' + this.end;
    }

    this.drawInteractiveContent();

    // Draw new tracks and annotations
    tc.drawTracks(this.inputField.value);
    ac.drawTracks(this.inputField.value);
  }

  // Key listener for quickly navigating between chromosomes
  keyMapper (options) {
    const keystrokeDelay = options.keystrokeDelay || 1000;

    let state = {
      buffer: '',
      lastKeyTime: Date.now()
    };

    document.addEventListener('keydown', event => {
      const key = event.key;
      const currentTime = Date.now();
      const eventType = window.event;
      const target = eventType.target || eventType.scrElement;
      const targetTagName = (target.nodeType === 1) ? target.nodeName.toUpperCase() : '';
      let buffer = '';

      // Do not listen to keydown events for active fields
      if (/INPUT|SELECT|TEXTAREA/.test(targetTagName)) {
        return;
      }

      if (key === 'Enter' &&
        currentTime - state.lastKeyTime < keystrokeDelay) {
        // Enter was pressed, process previous key presses.
        if (state.buffer <= 22 && state.buffer > 0) {
          this.chromosome = state.buffer;
        } else if (state.buffer.toUpperCase() == 'X' || state.buffer.toUpperCase() == 'Y') {
          this.chromosome = state.buffer.toUpperCase();
        } else {
          // No valid key pressed
          return;
        }
        this.redraw (this.chromosome + ':0-None');
      } else if (!isFinite(key) && key != 'x' && key != 'y') {
        // Arrow keys for moving graph
        switch (key) {
          case 'ArrowLeft':
            switch(this.chromosome) {
              case 'Y':
                this.chromosome = 'X';
                break;
              case 'X':
                this.chromosome = '22';
                break;
              case '1':
                this.chromosome = 'Y';
                break;
              default:
                this.chromosome = String(parseInt(this.chromosome) - 1);
                break;
            }
            this.redraw (this.chromosome + ':0-None');
            break;
          case 'ArrowRight':
            switch(this.chromosome) {
              case '22':
                this.chromosome = 'X';
                break;
              case 'X':
                this.chromosome = 'Y';
                break;
              case 'Y':
                this.chromosome = '1';
                break;
              default:
                this.chromosome = String(parseInt(this.chromosome) + 1);
                break;
            }
            this.redraw (this.chromosome + ':0-None');
            break;
          case 'a':
            left(this);
            break;
          case 'd':
            right(this);
            break;
          case 'w':
          case '+':
            zoomIn(this);
            break;
          case 's':
          case '-':
            zoomOut(this);
            break;
          default:
            return;
        }
      } else if (currentTime - state.lastKeyTime > keystrokeDelay) {
        // Reset buffer
        buffer = key;
      } else {
        if (state.buffer.length > 1) {
          // Buffer contains more than two digits, keep the last digit
          buffer = state.buffer[state.buffer.length - 1] + key;
        } else {
          // Add new digit to buffer
          buffer = state.buffer + key;
        }
      }
      // Save current state
      state = { buffer: buffer, lastKeyTime: currentTime };
    });
  }

  calcScale() {
    return this.plotWidth / (this.end - this.start);
  }
}
