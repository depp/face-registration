window.onload = function() {
	var canvas, cxt, data, image;
	var counter = 2;
	canvas = document.getElementById("canvas");
	cxt = canvas.getContext('2d');
	get_image();
	get_data();

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
		cxt.drawImage(image, 5, 5);
	}
}
