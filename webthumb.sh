#!/bin/bash

# Default values
URL=""
OUTPUT="thumbnail.png"
WIDTH=1280
HEIGHT=800
THUMB_WIDTH=320
THUMB_HEIGHT=240
TIMEOUT=30000
QUALITY=80
WAIT_TIME=2000  # Wait time for JavaScript/Canvas (ms)

function show_help {
  echo "Usage: $0 [OPTIONS] URL"
  echo ""
  echo "Options:"
  echo "  -o, --output FILE       Output filename (default: thumbnail.png)"
  echo "  -w, --width PIXELS      Viewport width (default: 1280)"
  echo "  -h, --height PIXELS     Viewport height (default: 800)"
  echo "  -tw, --thumb-width PX   Thumbnail width (default: 320)"
  echo "  -th, --thumb-height PX  Thumbnail height (default: 240)"
  echo "  -t, --timeout MS        Timeout in milliseconds (default: 30000)"
  echo "  -q, --quality NUM       JPEG quality 1-100 (default: 80)"
  echo "  -wait, --wait-time MS   Extra wait time for JS/Canvas (default: 2000)"
  echo "  --help                  Show this help message"
  echo ""
  echo "Example:"
  echo "  $0 -o thumbnail.jpg -tw 400 -th 300 https://example.com"
  exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -o|--output)
      OUTPUT="$2"
      shift 2
      ;;
    -w|--width)
      WIDTH="$2"
      shift 2
      ;;
    -h|--height)
      HEIGHT="$2"
      shift 2
      ;;
    -tw|--thumb-width)
      THUMB_WIDTH="$2"
      shift 2
      ;;
    -th|--thumb-height)
      THUMB_HEIGHT="$2"
      shift 2
      ;;
    -t|--timeout)
      TIMEOUT="$2"
      shift 2
      ;;
    -q|--quality)
      QUALITY="$2"
      shift 2
      ;;
    -wait|--wait-time)
      WAIT_TIME="$2"
      shift 2
      ;;
    --help)
      show_help
      ;;
    -*)
      echo "Unknown option: $1"
      show_help
      ;;
    *)
      URL="$1"
      shift
      ;;
  esac
done

# Check if URL is provided
if [ -z "$URL" ]; then
  echo "Error: URL is required"
  show_help
fi

# Check if Chrome is installed
if ! command -v google-chrome &> /dev/null && ! command -v chromium-browser &> /dev/null; then
  echo "Error: Google Chrome or Chromium is not installed"
  exit 1
fi

CHROME_CMD=$(command -v google-chrome || command -v chromium-browser)

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
TEMP_FILE="$TEMP_DIR/screenshot.png"

echo "Capturing screenshot of $URL..."
echo "Using temporary file: $TEMP_FILE"

# Additional flags for better JavaScript/Canvas support
JS_FLAGS="--run-all-compositor-stages-before-draw --disable-gpu"

# Capture screenshot
"$CHROME_CMD" --headless $JS_FLAGS --window-size=$WIDTH,$HEIGHT \
  --screenshot="$TEMP_FILE" --virtual-time-budget=$WAIT_TIME \
  --timeout=$TIMEOUT "$URL"

# Check if screenshot was created
if [ ! -f "$TEMP_FILE" ]; then
  echo "Error: Failed to create screenshot"
  rm -rf "$TEMP_DIR"
  exit 1
fi

# Create thumbnail using ImageMagick
if ! command -v convert &> /dev/null; then
  echo "Warning: ImageMagick not found, cannot resize image"
  cp "$TEMP_FILE" "$OUTPUT"
else
  echo "Resizing to ${THUMB_WIDTH}x${THUMB_HEIGHT}..."
  
  # Get file extension
  EXT="${OUTPUT##*.}"
  
  # Set quality option for JPEG
  QUALITY_OPT=""
  if [ "${EXT,,}" = "jpg" ] || [ "${EXT,,}" = "jpeg" ]; then
    QUALITY_OPT="-quality $QUALITY"
  fi
  
  # Resize image
  convert "$TEMP_FILE" -resize "${THUMB_WIDTH}x${THUMB_HEIGHT}^" \
    -gravity north -extent "${THUMB_WIDTH}x${THUMB_HEIGHT}" \
    $QUALITY_OPT "$OUTPUT"
fi

# Clean up
rm -rf "$TEMP_DIR"

echo "Thumbnail created: $OUTPUT"

