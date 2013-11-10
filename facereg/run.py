from wsgiref.simple_server import make_server
from pyramid.config import Configurator
from pyramid.response import Response
import argparse
import os
import sys
from . import image

def hello_world(request):
    return Response('Hello %(name)s!' % request.matchdict)

class App(object):
    __slots__ = ['picture_path', 'images']

    def __init__(self, picture_path):
        self.picture_path = os.path.abspath(picture_path)
        for img in image.find_images(self.picture_path):
            print img.relpath, img.get_orientation()
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
