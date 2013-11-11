var cxt;

function redraw() {
	cxt.fillStyle = "rgb(200, 100, 20)";
	cxt.fillRect(10, 10, 480, 480);
	cxt.fillStyle = "rgb(150, 75, 15)";
	cxt.fillRect(20, 20, 460, 460);
}

window.onload = function() {
	var canvas = document.getElementById("canvas");
	cxt = canvas.getContext('2d');
	redraw();
}
