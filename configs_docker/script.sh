#!/bin/bash
php-fpm8.4 -F &
nginx -g "daemon off;"