FROM alfg/nginx-rtmp:latest

COPY rtmp/nginx.conf /etc/nginx/nginx.conf
COPY rtmp/ffmpeg-transcode.sh /opt/ffmpeg-transcode.sh

RUN chmod +x /opt/ffmpeg-transcode.sh
