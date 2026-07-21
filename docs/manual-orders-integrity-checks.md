# Comprobaciones de integridad

- pedidos manuales requieren cliente registrado o snapshot invitado;
- producto personalizado y FK de producto son mutuamente excluyentes;
- moneda es COP;
- valores son no negativos;
- canal, panel, entrega y fuente de tarifa usan enumeraciones controladas;
- borradores tienen versión positiva;
- movimientos tienen cantidad positiva y unicidad por tipo.
