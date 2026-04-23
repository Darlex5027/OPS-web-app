#!/bin/bash
chown -R www-data:www-data /home/uploads
chmod -R 775 /home/uploads

php-fpm8.4 -F &
nginx -g "daemon off;"


