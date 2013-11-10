import os
import urllib

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
            imagepath = os.path.join(dirpath, filename)
            uri = urllib.pathname2url(os.path.relpath(imagepath, path))
            yield Image(imagepath, uri)

class Image(object):
    __slots__ = ['path', 'uri']
    def __init__(self, path, uri):
        self.path = path
        self.uri = uri

    @property
    def type(self):
        """Gets the mime type of the image.

        This will be None if the mime type could not be detected.
        """
        base, ext = os.path.splitext(self.path)
        return TYPES.get(ext.lower())

    def get_exif(self):
        """Get the EXIF information, or None if there is none."""
        if self.type != 'image/jpeg':
            return None
        try:
            image = pil_image.open(self.path)
        except IOError:
            return None
        return image._getexif()

    def get_orientation(self):
        """Get the image orientation."""
        exif = self.get_exif()
        if exif:
            return exif.get(ORIENTATION, 1)
        return 1
