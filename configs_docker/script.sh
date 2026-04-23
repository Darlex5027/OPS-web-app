#!/bin/bash
#Permisos para upload
chown -R www-data:www-data /home/uploads
chmod -R 775 /home/uploads

##Arrancar php
php-fpm8.4 -F &
##Arrancar nginx
nginx -g "daemon off;"
