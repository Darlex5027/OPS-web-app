FROM debian:latest
EXPOSE 80
RUN apt-get update && apt-get install -y nginx
CMD ["nginx", "-g", "daemon off;"]
