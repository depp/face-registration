from wsgiref.simple_server import make_server
from pyramid.config import Configurator
from pyramid.response import Response
import argparse
import os
import sys

# PIL
import Image as pil_image
import PIL.ExifTags

def exif_tag(name):
    """Look up the EXIF tag which has the given name."""
    for k, v in PIL.ExifTags.TAGS.items():
        if v == name:
            return k
    raise KeyError('No such EXIF tag.')
ORIENTATION = exif_tag('Orientation')

TYPES = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
}

def find_images(path):
    """Iterate over all images below the given path."""
    extensions = {ext for ext, mimetype in TYPES.items()
                  if mimetype.startswith('image/')}
    for dirpath, dirnames, filenames in os.walk(path):
        dirnames[:] = [dirname for dirname in dirnames
                       if not dirname.startswith('.')]
        for filename in filenames:
            if filename.startswith('.'):
                continue
            base, ext = os.path.splitext(filename)
            if ext.lower() not in extensions:
                continue
            yield os.path.relpath(os.path.join(dirpath, filename), path)

class Image(object):
    __slots__ = ['relpath', 'fullpath']
    def __init__(self, relpath, fullpath):
        self.relpath = relpath
        self.fullpath = fullpath

    @property
    def type(self):
        """Gets the mime type of the image.

        This will be None if the mime type could not be detected.
        """
        base, ext = os.path.splitext(self.relpath)
        return TYPES.get(ext.lower())

    def get_exif(self):
        """Get the EXIF information, or None if there is none."""
        if self.type != 'image/jpeg':
            return None
        try:
            image = pil_image.open(self.fullpath)
        except IOError:
            return None
        return image._getexif()

    def get_orientation(self):
        """Get the image orientation."""
        exif = self.get_exif()
        if exif:
            return exif.get(ORIENTATION, 1)
        return 1

def hello_world(request):
    return Response('Hello %(name)s!' % request.matchdict)

class App(object):
    __slots__ = ['picture_path', 'images']

    def __init__(self, picture_path):
        self.picture_path = os.path.abspath(picture_path)
        for relpath in find_images(self.picture_path):
            image = Image(relpath, os.path.join(self.picture_path, relpath))
            print image.relpath, image.get_orientation()
        sys.exit(0)

    @classmethod
    def parse_args(class_):
        p = argparse.ArgumentParser()
        p.add_argument('picture_path')
        args = p.parse_args()
        return class_(args.picture_path)

    def run(self):
        config = Configurator()
        config.add_route('hello', '/hello/{name}')
        config.add_view(hello_world, route_name='hello')
        config.add_static_view(name='pictures', path=self.picture_path)
        app = config.make_wsgi_app()
        server = make_server('0.0.0.0', 8080, app)
        server.serve_forever()

if __name__ == '__main__':
    App.parse_args().run()
