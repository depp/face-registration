#!/bin/sh
if test ! -x "${PYTHON}" ; then
    PYTHON=`which python2`
fi
if test ! -x "${PYTHON}" ; then
    PYTHON=`which python`
fi
"${PYTHON}" -m facereg.run "$@"
