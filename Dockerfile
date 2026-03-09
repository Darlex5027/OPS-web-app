FROM debian:latest
EXPOSE 80
RUN apt-get update && apt-get install -y nginx php-fpm php-mysql  && rm /etc/nginx/sites-enabled/default
RUN sed -i 's/;clear_env = no/clear_env = no/' /etc/php/8.4/fpm/pool.d/www.conf
COPY ./configs_docker/script.sh /usr/local/bin
COPY ./configs_docker/default.conf /etc/nginx/sites-available/
RUN ln -s /etc/nginx/sites-available/default.conf /etc/nginx/sites-enabled/default.conf
RUN chmod +x /usr/local/bin/script.sh
CMD ["/usr/local/bin/script.sh"]
