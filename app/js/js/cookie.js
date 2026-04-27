/* 
Daniela Hernandez Hernandez
Fecha de creacion: 23 de abril del 2026
El archivo cookie.js es una utilidad diseñada para extraer el valor de una cookie 
específica almacenada en el navegador mediante los datos enviados el login.js
*/
export { obtenerCookie }

const obtenerCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}