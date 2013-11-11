var canvas, cxt, data, image;
var counter = 2;

window.onload = function() {
	canvas = document.getElementById("canvas");
	cxt = canvas.getContext('2d');
	get_image();
	get_data();
}

function get_image() {
	image = new Image();
	image.onload = function(e) {
		counter--;
		if (counter == 0)
			redraw();
	}
	image.src = image_uri;
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
				redraw();
		} else {
			console.log("Error!");
		}
	}
	req.send(null);
}

function redraw() {
	var cwidth = canvas.width;
	var cheight = canvas.height;
	cxt.fillStyle = "rgb(40, 40, 40)";
	cxt.fillRect(0, 0, cwidth, cheight);

	var iwidth = image.width;
	var iheight = image.height;
	cxt.save();
	var swapxy = false;
	cxt.translate(cwidth/2, cheight/2);
	switch (data.orientation) {
	case 1:
		break;
	case 3:
		cxt.rotate(Math.PI);
		break;
	case 6:
		cxt.rotate(Math.PI * -0.5);
		swapxy = true;
		break;
	case 8:
		cxt.rotate(Math.PI * 0.5);
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
	cxt.rotate(Math.PI);
	cxt.scale(scale, scale);
	cxt.translate(-iwidth/2, -iheight/2);
	cxt.drawImage(image, 5, 5);
	cxt.restore();
}

