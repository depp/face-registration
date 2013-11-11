from wsgiref.simple_server import make_server
from pyramid.config import Configurator
from pyramid.response import Response
from pyramid.view import view_config
import argparse
import os
import sys
from . import image

srcdir = os.path.dirname(os.path.abspath(__file__))

class ImageSet(object):
    __slots__ = ['picture_path', 'images']

    def __init__(self, picture_path):
        self.picture_path = os.path.abspath(picture_path)
        self.images = list(image.find_images(self.picture_path))

def hello_world(request):
    return Response('Hello %(name)s!' % request.matchdict)

@view_config(route_name='all', renderer='all.mako')
def all_view(self, request):
    return {'images': DATA.images}

@view_config(route_name='image', renderer='image.mako')
def image_view(self, request):
    image_id = int(request.matchdict['id'])
    img = DATA.images[image_id]
    return {'image': img}

def init():
    p = argparse.ArgumentParser()
    p.add_argument('picture_path')
    args = p.parse_args()
    global DATA
    DATA = ImageSet(args.picture_path)

def run():
    init()
    settings = {
        'reload_all': True,
        'debug_all': True,
        'mako.directories': os.path.join(srcdir, 'templates'),
    }
    config = Configurator(settings=settings)
    config.add_static_view('image-data', DATA.picture_path)
    config.add_route('all', '/image')
    config.add_route('image', '/image/{id}')
    config.scan()
    app = config.make_wsgi_app()
    server = make_server('0.0.0.0', 8080, app)
    server.serve_forever()

if __name__ == '__main__':
    run()
