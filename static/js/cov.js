function createCanvas(canvas_width, canvas_height, canvasID) {
    var canvas = document.createElement('canvas');
    canvas.width = canvas_width;
    canvas.height = canvas_height;
    document.getElementById(canvasID).appendChild(canvas);
    return canvas;
}

// Function draws static y-axis coordinate lines
function draw_y_coordinates (ctx, cvar, start, end, fraction, top_padding) {
    var position = 0;
    var step = cvar.box_height / ((start - end) / fraction);
    // Draw lines and values for Y-axis
    for (let i = start.toFixed(1); i >= end; i = (i - fraction).toFixed(1)) {
        let ypos = top_padding + position;

        ctx.beginPath();

        // Draw a tick mark for values
        ctx.moveTo(cvar.left_padding - cvar.tick_len / 2, ypos);
        ctx.lineTo(cvar.left_padding + cvar.tick_len / 2, ypos);
        ctx.stroke();

        // Draw a transparent line across box
        if (i != start && i != end) {
            ctx.save();
            ctx.lineWidth = cvar.tick_width;
            ctx.strokeStyle = cvar.line_colour;
            ctx.moveTo(cvar.left_padding, ypos);
            ctx.lineTo(cvar.left_padding + cvar.box_width, ypos);
            ctx.stroke();
            ctx.restore();
        }

        // Draw Y-axis value
        ctx.font = "12px Arial";
        ctx.fillText(i, 25, ypos + 4);
        position += step;
    }
}

function draw_bounding_box (ctx, cvar, fraction, top_padding, top_offset) {
    // Draw boundingbox and clear it from colour
    ctx.lineWidth = 2;
    ctx.clearRect(cvar.left_padding, top_padding - top_offset,
            cvar.box_width, cvar.box_height + top_offset);
    ctx.rect(cvar.left_padding, top_padding, cvar.box_width, cvar.box_height);
    ctx.stroke();

}

function draw_rotated_text (ctx, text, posx, posy) {
    ctx.save();
    ctx.font = "18px Arial";
    ctx.translate(posx, posy); // Position for text
    ctx.rotate(-Math.PI/2); // Rotate 90 degrees
    ctx.textAlign = 'center';
    ctx.fillText(text, 0, 9);
    ctx.restore();
}

class GeneCanvas {
    constructor(canvas_width, canvas_height) {
        // Canvas variables
        this.cvar = {
            // Box values
            left_padding: 50,
            top_offset: 25,
            box_width: canvas_width,
            box_height: canvas_height / 2,
            tick_len: 6,
            tick_width: 0.2,
            line_colour: "#000000",

            // BAF values
            baf_start: 1.0,
            baf_end: 0.0,
            baf_frac: 0.2,
            baf_padding: 40,

            // LogR values
            logr_start: 4.0,
            logr_end: -4.0,
            logr_frac: 1.0,
            logr_padding: 0
        }
        this.cvar.box_width -= this.cvar.left_padding;
        this.cvar.box_height = (canvas_height - this.cvar.top_offset - this.cvar.baf_padding) / 2;
        this.cvar.logr_padding = this.cvar.baf_padding + this.cvar.box_height + 20;

        // Create canvas for data
        this.dataCanvas = createCanvas(canvas_width, canvas_height, 'interactive-container');
        this.dataCanvas.id = "dataCanvas";

        this.drawCanvas = createCanvas(canvas_width, canvas_height, 'interactive-container');
        this.drawCanvas.id = "drawCanvas";

        // Create static canvas
        this.staticCanvas = createCanvas(canvas_width, canvas_height, 'interactive-container');
        this.staticCanvas.id = "staticCanvas";

        // Draw on static canvas
        let ctx = staticCanvas.getContext("2d");

        // Set colour of whole canvas
        ctx.save();
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, staticCanvas.width, staticCanvas.height);
        ctx.restore();

        // Draw BAF context
        draw_bounding_box(ctx, this.cvar, this.cvar.baf_frac,
                this.cvar.baf_padding, this.cvar.top_offset);
        draw_y_coordinates(ctx, this.cvar, this.cvar.baf_start,
                this.cvar.baf_end, this.cvar.baf_frac, this.cvar.baf_padding);

        // Draw LogR context
        draw_bounding_box(ctx, this.cvar, this.cvar.logr_frac, this.cvar.logr_padding, 0);
        draw_y_coordinates(ctx, this.cvar, this.cvar.logr_start,
                this.cvar.logr_end, this.cvar.logr_frac, this.cvar.logr_padding);

        // Draw rotated y-axis legends
        draw_rotated_text(ctx, "B Allele Freq", 10,
                this.cvar.baf_padding + this.cvar.box_height / 2);
        draw_rotated_text(ctx, "Log R Ratio", 10,
                this.cvar.logr_padding + this.cvar.box_height / 2);
    }
}

class OverviewCanvas {
    constructor(canvas_width, canvas_height) {
        // Canvas variables
        this.cvar = {
            // Box values
            left_padding: 5,
            top_offset: 5,
            box_width: canvas_width,
            box_height: canvas_height / 2,
            tick_len: 6,
            tick_width: 0.2,
            line_colour: "#000000",

            // BAF values
            baf_start: 1.0,
            baf_end: 0.0,
            baf_frac: 0.2,
            baf_padding: 20,

            // LogR values
            logr_start: 4.0,
            logr_end: -4.0,
            logr_frac: 1.0,
            logr_padding: 0
        }
        this.cvar.box_width -= this.cvar.left_padding;
        this.cvar.box_height = (canvas_height - this.cvar.top_offset - this.cvar.baf_padding) / 2;
        this.cvar.logr_padding = this.cvar.baf_padding + this.cvar.box_height;

        this.staticCanvas = createCanvas(canvas_width, canvas_height, 'overview-container');
        this.staticCanvas.id = "staticCanvas";

        // Draw overview canvas
        let ctx = this.staticCanvas.getContext("2d");

        // Draw BAF context
        draw_bounding_box(ctx, this.cvar, this.cvar.baf_frac,
                this.cvar.baf_padding, this.cvar.top_offset);
        // Draw LogR context
        draw_bounding_box(ctx, this.cvar, this.cvar.logr_frac,
                this.cvar.logr_padding, 0);
    }
}

function draw_title(ctx, cvar, title, title_len) {
    ctx.clearRect(0, 0, cvar.box_width, cvar.baf_padding - cvar.top_offset);
    ctx.font = "bold 14px Arial";
    ctx.fillText(title,
            cvar.left_padding + cvar.box_width / 2 - title_len / 2,
            cvar.baf_padding - cvar.top_offset);
}

function draw_x_axis(ctx, cvar, canvas_width) {
    let scale = canvas_width / (end - start);
    let xaxis_tick_frq = Math.pow(10, (end - start).toString().length - 2);
    let xaxis_tick = Math.ceil(start / xaxis_tick_frq) * xaxis_tick_frq;
    let x_axis_offset = 10; // Offset from top padding
    let every_other = false;
    ctx.font = "9px Arial";

    if (((end - start) / xaxis_tick_frq) > 15 ) {
        every_other = true;
    }

    // Draw x-axis tick value
    let counter = 0;
    let prev_xpos = 0;
    while (xaxis_tick < end) {
        ctx.fillRect(scale * (xaxis_tick - start),
                            cvar.baf_padding - 2,
                            2, 5);
        counter++;
        // Only draw value on every other tick
        txt = numberWithCommas(xaxis_tick);
        txt_width = ctx.measureText(txt).width;
        let tick_xpos = scale * (xaxis_tick - start) - txt_width / 2;
        if((!every_other || counter % 2 == 0) && (tick_xpos - prev_xpos) > (txt_width + 5)) {
            ctx.fillText(txt, tick_xpos, cvar.baf_padding - x_axis_offset);
            prev_xpos = tick_xpos;
        }
        xaxis_tick += xaxis_tick_frq;
    }
}

function draw_coverage(data, baf, canvas, chromosome) {
    let ch = data[0][0];
    let interactive = canvas.drawCanvas ? true : false;
    let cov_start = interactive ? start : chrom_start;
    let cov_end = interactive ? end : chrom_end;
    let title_len = interactive ? 110 : 12;
    let left_padding = interactive ? 0 : canvas.cvar.left_padding;

    // Draw on empty temporary canvas
    let ctx = interactive ? canvas.drawCanvas.getContext("2d") :
            canvas.staticCanvas.getContext("2d");
    let canvas_width = interactive ? canvas.drawCanvas.width :
            canvas.staticCanvas.width;
    let canvas_height = interactive ? canvas.drawCanvas.height :
            canvas.staticCanvas.height;

    // Only draw title and x-axis values for interactive canvas
    if (interactive) {
        ctx.clearRect(0, 0, canvas_width, canvas_height);
        draw_title(canvas.staticCanvas.getContext("2d"), canvas.cvar,
                'Chromosome ' + chromosome, title_len);
        draw_x_axis(ctx, canvas.cvar, canvas_width);
    } else {
        draw_title(ctx, canvas.cvar, chromosome, title_len);
    }
    console.log(ch, cov_start, cov_end, (cov_end - cov_start), data.length);

    // Draw BAF values
    let ampl = canvas.cvar.box_height;
    let padding = canvas.cvar.baf_padding + canvas.cvar.box_height;
    let scale = canvas_width / (cov_end - cov_start);
    ctx.fillStyle = "#FF0000";
    for (let i = 0; i < baf.length - 1; i++) {
        ctx.fillRect(left_padding + scale * (baf[i][1] - cov_start),
                padding - ampl * baf[i][3], 2, 2);
    }

    ctx.fillStyle = "#000000";
    if (chrom == call_chrom && (cov_start < call_end && cov_end > call_start)) {
        ctx.fillRect(left_padding + scale * (call_start - cov_start),
                120, scale * (call_end - call_start), canvas.cvar.top_offset);
        console.log("DRAW_CALL");
    }

    // Draw Log R ratio values
    ampl = canvas.cvar.box_height / (2 * canvas.cvar.logr_start);
    padding = canvas.cvar.logr_padding + canvas.cvar.box_height / 2;
    if (data.length > 1000) {
        for (let i = 0; i < data.length - 1; i++) {
            ctx.fillRect(left_padding + scale * (data[i][1] - cov_start),
                    padding - ampl * data[i][3], 2, 2);
        }
    } else {
        ctx.beginPath();
        ctx.moveTo(canvas.cvar.left_padding, padding - ampl * data[0][3]);
        for (let i = 1; i < data.length - 1; i++) {
            ctx.lineTo(left_padding + scale * (data[i][1] - cov_start),
                    padding - ampl * data[i][3], 2, 2);
        }
        ctx.stroke();
    }

    if (interactive) {
        canvas.dataCanvas.getContext("2d").clearRect(0, 0,
                                                canvas.dataCanvas.width,
                                                canvas.dataCanvas.height);
        canvas.dataCanvas.getContext("2d").drawImage(canvas.drawCanvas, 0, 0);
    }
}

function left() {
    let size = end - start;
    start -= Math.floor(0.1 * size);
    end -= Math.floor(0.1 * size);
    redraw();
}
function right() {
    let size = end - start;
    start += Math.floor(0.1 * size);
    end += Math.floor(0.1 * size);
    redraw();
}
function zoom_in() {
    let size = end - start;
    start += Math.floor(size * 0.25);
    end -= Math.floor(size * 0.25);
    redraw();
}
function zoom_out() {
    let size = end - start;
    start -= Math.floor(size * 0.5);
    end += Math.floor(size * 0.5);
    if (start < 1) {
        start = 1;
    }
    redraw();
}

function redraw() {
    $.getJSON($SCRIPT_ROOT + '/_getcov', {
        region: chrom + ":" + start + "-" + end,
    }, function(result) {
        draw_coverage(result["data"], result["baf"], gc, chrom);
    }).done (function() { disallow_drag = false; });
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function keyMapper (options) {
    const keystrokeDelay = options && options.keystrokeDelay || 1000;

    let state = {
        buffer: "",
        lastKeyTime: Date.now()
    };

    document.addEventListener('keydown', event => {
        const key = event.key;
        const currentTime = Date.now();
        const eventType = window.event;
        const target = eventType.target || eventType.scrElement;
        const targetTagName = (target.nodeType == 1) ? target.nodeName.toUpperCase() : "";
        let buffer = "";

        // Do not listen to keydown events for active fields
        if (/INPUT|SELECT|TEXTAREA/.test(targetTagName)) {
            return;
        }

        if (event.keyCode == 13 &&
            currentTime - state.lastKeyTime < keystrokeDelay) {
            // Enter was pressed, process previous key presses.
            if (state.buffer < 24 && state.buffer > 0) {
                // Display new chromosome
                chrom = state.buffer
                redraw();
            }
        } else if (!isFinite(key)) {
            // Arrow keys for moving graph
            switch(event.keyCode) {
                case 37: // Left arrow
                    left();
                    break;
                case 39: // Right arrow
                    right();
                    break;
                case 38: // Up arrow
                    zoom_in();
                    break;
                case 40: // Down arrow
                    zoom_out();
                    break;
                default:
                    return;
            }
        } else if (currentTime - state.lastKeyTime > keystrokeDelay) {
            // Reset buffer
            buffer = key;
        } else {
            if(state.buffer.length > 1) {
                // Buffer contains more than two digits, keep the last digit
                buffer = state.buffer[state.buffer.length - 1] + key;
            } else {
                // Add new digit to buffer
                buffer = state.buffer + key;
            }
        }

        // Save current state
        state = {buffer: buffer, lastKeyTime: currentTime};
    });
}
