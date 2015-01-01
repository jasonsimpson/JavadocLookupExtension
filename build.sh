#!/bin/bash
#
# Config variables
#
APP_NAME=javadocmozplugin.xpi
INCLUDE_FILE_TYPES="js xul rdf manifest"
EXCLUDE_DIRS="CVS"

#
# Create the "find" command opt we will use to get the list of files
#
FIND_FILE_TYPE_OPTS=""
for TYPE in $INCLUDE_FILE_TYPES; do
    if [ "$FIND_FILE_TYPE_OPTS" == "" ]; then
        FIND_FILE_TYPE_OPTS="-name *.$TYPE"
    else
        FIND_FILE_TYPE_OPTS="$FIND_FILE_TYPE_OPTS -o -name *.$TYPE"
    fi
done

# echo "Find opts: $FIND_FILE_TYPE_OPTS"

#
# Create list of files to include
#
INCLUDE_FILES=`find . $FIND_FILE_TYPE_OPTS`

# echo "Found files: $INCLUDE_FILES"

zip $APP_NAME $INCLUDE_FILES

