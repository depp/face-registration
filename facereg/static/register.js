// The registration canvas (interactive) and the preview canvas
// (non-interactive).  Attributes:
// * 'canvas': the canvas DOM element.
// * 'cxt': the 2D drawing context.
// * 'transformation': the transformation used to draw the image.
var register, preview;

// The persistent data for this image.  Attributes:
// * 'orientation': the EXIF orientation for the image.
// * 'markers': the markers on the image.
var data;

// The image element for this image.
var global_image;

// Counter for async element loading.
var counter = 2;

// The index of the currently selected marker.
var selection = null;

// Whether we are currently dragging a marker around.
var dragging = false;

// The radius with which we can click on a marker to select it.
var CLICK_RADIUS = 12;

// The target position for the center of the markers
var TARGET_SIZE = 0.2;
// The target distance for the markers
var TARGET_POS = [0.5, 0.4];

// Capture events on a DOM object and pass them to a target object
function capture_events(object, target, events) {
	function handler(event) {
		return target[event.type](event);
	}
	for (var i = 0; i < events.length; i++) {
		object.addEventListener(events[i], handler);
	}
}

// ImageView: draws the image in a canvas
// Requires a 'transform' method to transform the image

function ImageView(canvas, image) {
	this.canvas = canvas;
	this.cxt = canvas.getContext('2d');
	this.image = image;
}

// Draw the image and the background
ImageView.prototype.draw_image = function() {
	var cxt = this.cxt;
	cxt.fillStyle = "rgb(40, 40, 40)";
	cxt.fillRect(0, 0, this.canvas.width, this.canvas.height);
	cxt.save();
	this.transform(cxt);
	cxt.drawImage(this.image, 0, 0);
	cxt.restore();
}

// Calculate the mouse location for an event, in image coordinates
// If mode is 'clamp', then it will be clamped to image bounds
// If mode is 'check', then result will be null if it is out of bounds
// If mode is 'full', then result will always be returned
ImageView.prototype.mouse_loc = function(event, mode) {
	var x = event.pageX - this.canvas.offsetLeft;
	var y = event.pageY - this.canvas.offsetTop;
	var v = this.transformation.apply_reverse([x, y]);
	switch (mode) {
	case 'clamp':
		v[0] = Math.max(0, Math.min(this.image.width, v[0]));
		v[1] = Math.max(0, Math.min(this.image.height, v[1]));
		break;
	case 'check':
		if (v[0] < 0 || v[0] > this.image.width ||
			v[1] < 0 || v[1] > this.image.height)
			return null;
		break;
	case 'full':
		break;
	default:
		throw "Invalid mode";
	}
	return v;
}

// RegisterView: view for creating the points for registration

RegisterView = function(canvas, image) {
	ImageView.call(this, canvas, image);
	capture_events(canvas, this, ['mousedown', 'mousemove', 'mouseup']);
}

RegisterView.prototype = Object.create(ImageView.prototype);
RegisterView.prototype.constructor = RegisterView;

RegisterView.prototype.mousedown = function(event) {
	var pos = this.mouse_loc(event, 'check');
	if (!pos)
		return;
	if (!data.markers)
		data.markers = []
	var markers = data.markers;
	var spos = this.transformation.apply(pos);
	selection = null;
	for (var i = 0; i < markers.length; i++) {
		var mpos = this.transformation.apply(markers[i]);
		var d2 = dist2(spos, mpos);
		if (d2 <= CLICK_RADIUS * CLICK_RADIUS) {
			selection = i;
			break;
		}
	}
	if (selection === null) {
		data.markers.push(pos);
		selection = data.markers.length - 1;
	}
	dragging = true;
	update();
}

RegisterView.prototype.mousemove = function(event) {
	if (!dragging)
		return;
	var pos = this.mouse_loc(event, 'clamp');
	data.markers[selection] = pos;
	update();
};

RegisterView.prototype.mouseup = function(event) {
	dragging = false;
}

RegisterView.prototype.transform = function(obj) {
	var cwidth = this.canvas.width;
	var cheight = this.canvas.height;
	var iwidth = this.image.width;
	var iheight = this.image.height;
	var swapxy = false;

	obj.translate(cwidth/2, cheight/2);
	switch (data.orientation) {
	case 1:
		obj.rotate(Math.PI);
		break;
	case 3:
		break;
	case 6:
		obj.rotate(Math.PI * 0.5);
		swapxy = true;
		break;
	case 8:
		obj.rotate(Math.PI * +0.5);
		swapxy = true;
		break;
	}
	var scalex, scaley;
	if (swapxy) {
		scalex = cwidth / iheight;
		scaley = cheight / iwidth;
	} else {
		scalex = cwidth / iwidth;
		scaley = cheight / iheight;
	}
	var scale = Math.min(scalex, scaley);
	obj.scale(scale, scale);
	obj.translate(-iwidth/2, -iheight/2);
}

RegisterView.prototype.update = function() {
	this.transformation = new Transformation();
	this.transform(this.transformation);
	this.draw();
}

RegisterView.prototype.draw = function() {
	this.draw_image();

	var cxt = this.cxt;
	var markers = data.markers;
	if (markers) {
		for (var i = 0; i < markers.length; i++) {
			var pos = this.transformation.apply(markers[i]);
			if (i == selection) {
				cxt.fillStyle = "rgb(255, 255, 0)";
			} else {
				cxt.fillStyle = "rgb(255, 0, 0)";
			}
			cxt.fillRect(pos[0] - 5, pos[1] - 5, 10, 10);
		}
	}
}

// PreviewView: view showing a preview of the transformed image

PreviewView = function(canvas, image) {
	ImageView.call(this, canvas, image);
}

PreviewView.prototype = Object.create(ImageView.prototype);
PreviewView.prototype.constructor = PreviewView;

PreviewView.prototype.transform = function(obj) {
	var cwidth = this.canvas.width;
	var cheight = this.canvas.height;
	var iwidth = this.image.width;
	var iheight = this.image.height;


	obj.translate(TARGET_POS[0] * cwidth, TARGET_POS[1] * cheight);
	obj.rotate(this.stats.angle);
	var scale = (TARGET_SIZE * cwidth) / this.stats.size;
	obj.scale(scale, scale);
	obj.translate(-this.stats.center[0], -this.stats.center[1]);
};

PreviewView.prototype.update = function() {
	var markers = data.markers;
	if (markers && markers.length == 2) {
		this.stats = {
			'center': [(markers[0][0] + markers[1][0])/2,
					   (markers[0][1] + markers[1][1])/2],
			'angle': Math.atan2(markers[0][1] - markers[1][1],
								markers[0][0] - markers[1][0]),
			'size': dist(markers[0], markers[1])
		};
	} else {
		this.stats = null;
	}

	this.draw();
}

PreviewView.prototype.draw = function() {
	var cwidth = this.canvas.width;
	var cheight = this.canvas.height;
	var cxt = this.cxt;

	if (this.stats) {
		this.draw_image();

		var y = cheight * TARGET_POS[1];
		var x0 = cwidth * 0.5 * (1 - TARGET_SIZE);
		var x1 = cwidth * 0.5 * (1 + TARGET_SIZE);
		cxt.strokeStyle = 'rgb(200, 200, 200)';
		cxt.beginPath();
		cxt.moveTo(0, y);
		cxt.lineTo(cwidth, y);
		cxt.moveTo(x0, 0);
		cxt.lineTo(x0, cheight);
		cxt.moveTo(x1, 0);
		cxt.lineTo(x1, cheight);
		cxt.stroke();
	} else {
		cxt.fillStyle = 'rgb(40, 40, 40)';
		cxt.fillRect(0, 0, cwidth, cheight);

		cxt.strokeStyle = 'rgb(200, 200, 200)';
		cxt.beginPath();
		cxt.moveTo(0, 0);
		cxt.lineTo(cwidth, cheight);
		cxt.moveTo(0, cheight);
		cxt.lineTo(cwidth, 0);
		cxt.stroke();
	}
}

// ============================================================

window.onload = function() {
	get_image();
	get_data();
}

function recompute_transformation() {
	transformation = new Transformation();
	transform(transformation);
}

function get_image() {
	global_image = new Image();
	global_image.onload = function(e) {
		counter--;
		if (counter == 0)
			loaded();
	}
	global_image.src = image_uri;
}

function get_data() {
	var req = new XMLHttpRequest();
	req.open('GET', data_uri, false);
	req.onload = function(e) {
		if (req.readyState !== 4)
			return;
		if (req.status === 200) {
			data = JSON.parse(req.response);
			counter--;
			if (counter == 0)
				loaded();
		} else {
			console.log("Error!");
		}
	}
	req.send(null);
}

function loaded() {
	register = new RegisterView(
		document.getElementById('register'), global_image);
	preview = new PreviewView(
		document.getElementById('preview'), global_image);
	update();
}

function update() {
	register.update();
	preview.update();
}

// Matrix math, using 3x2 matrices and homogeneous coordinates.
// A point (x,y) is represented by the column vector [x,y,1].

// Identity matrix
function mat_identity() {
	return [1, 0, 0,
			0, 1, 0];
}

// Rotation matrix
function mat_rotate(a) {
	var u = Math.cos(a), v = Math.sin(a);
	return [u, -v, 0,
			v, u, 0];
}

// Translation matrix
function mat_translate(dx, dy) {
	return [1, 0, dx,
			0, 1, dy];
}

// Scale matrix
function mat_scale(x, y) {
	return [x, 0, 0,
			0, y, 0];
}

// Matrix multiply
function mat_multiply(x, y) {
	var x11 = x[0], x12 = x[1], x13 = x[2], x21 = x[3], x22 = x[4], x23 = x[5];
	var y11 = y[0], y12 = y[1], y13 = y[2], y21 = y[3], y22 = y[4], y23 = y[5];
	return [x11*y11 + x12*y21, x11*y12 + x12*y22, x11*y13 + x12*y23 + x13,
			x21*y11 + x22*y21, x21*y12 + x22*y22, x21*y13 + x22*y23 + x23];
}

// Matrix multiply by vector
function mat_vector(m, v) {
	var m11 = m[0], m12 = m[1], m13 = m[2], m21 = m[3], m22 = m[4], m23 = m[5];
	var v11 = v[0], v21 = v[1];
	return [m11*v11 + m12*v21 + m13,
			m21*v11 + m22*v21 + m23];
}

function Transformation() {
	this.forward = mat_identity();
	this.inverse = mat_identity();
}

Transformation.prototype._apply_matrix = function(mat, inv) {
	this.forward = mat_multiply(this.forward, mat);
	this.inverse = mat_multiply(inv, this.inverse);
};

Transformation.prototype.translate = function(dx, dy) {
	this._apply_matrix(mat_translate(dx, dy), mat_translate(-dx, -dy));
}

Transformation.prototype.rotate = function(a) {
	this._apply_matrix(mat_rotate(a), mat_rotate(-a));
}

Transformation.prototype.scale = function(x, y) {
	this._apply_matrix(mat_scale(x, y), mat_scale(1/x, 1/y));
}

Transformation.prototype.apply = function(pos) {
	return mat_vector(this.forward, pos);
}

Transformation.prototype.apply_reverse = function(pos) {
	return mat_vector(this.inverse, pos);
}

// Calculate the squared distance between two points.
function dist2(u, v) {
	var dx = u[0] - v[0], dy = u[1] - v[1];
	return dx*dx + dy*dy;
}

// Calculate the distance between two points.
function dist(u, v) {
	return Math.sqrt(dist2(u, v));
}
