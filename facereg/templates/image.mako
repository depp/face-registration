<%inherit file="layout.mako"/>
<canvas id="canvas" width="500" height="500">
</canvas>
<script>
var image_uri = "/image-data/${image.uri}";
var data_uri = "${request.route_path('data', id=image_id)}";
</script>
<script src="/static/register.js"></script>
