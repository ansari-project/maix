#!/bin/bash

# Event Manager Demo Video Processing Script

echo "📹 Processing Event Manager Demo Video..."

# Create demo directory if it doesn't exist
mkdir -p demos

# Find the latest video file
VIDEO_FILE=$(find test-results -name "video.webm" -type f -mmin -10 | head -1)

if [ -z "$VIDEO_FILE" ]; then
    echo "❌ No recent video file found"
    exit 1
fi

echo "✅ Found video: $VIDEO_FILE"

# Copy to demos directory with descriptive name
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_FILE="demos/event-manager-demo_${TIMESTAMP}.webm"
cp "$VIDEO_FILE" "$OUTPUT_FILE"

echo "✅ Video saved to: $OUTPUT_FILE"
echo ""
echo "📋 Video Details:"
ls -lh "$OUTPUT_FILE"
echo ""
echo "🎬 To view the video:"
echo "   Open in browser: file://$(pwd)/$OUTPUT_FILE"
echo ""
echo "💡 To convert to MP4 (requires ffmpeg):"
echo "   ffmpeg -i $OUTPUT_FILE demos/event-manager-demo_${TIMESTAMP}.mp4"
echo ""
echo "📝 Voiceover script available at:"
echo "   scripts/event-manager-voiceover.md"
echo ""
echo "✨ Demo video processing complete!"