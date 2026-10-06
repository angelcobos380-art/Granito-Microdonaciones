INSERT INTO usuarios (nombre, correo, password_hash, rol)
VALUES ('Administrador Granito', 'admin@granito.demo', '$2b$10$JMFDXGubKz.AZ2a4uVdBhOIvRrdi7zPCW3JNRgPX3n3ZwEwpnGgJi', 'admin');

INSERT INTO organizaciones (nombre, descripcion, logo, verificada, es_ficticia) VALUES
('Salud para Todas', 'Organización ficticia — demo. Acercamos atención básica a comunidades.', '🩺', TRUE, TRUE),
('Aula Abierta', 'Organización ficticia — demo. Impulsamos el aprendizaje de niñas y niños.', '📚', TRUE, TRUE),
('Raíces Vivas', 'Organización ficticia — demo. Protegemos los ecosistemas locales.', '🌿', TRUE, TRUE),
('Huellitas Seguras', 'Organización ficticia — demo. Cuidamos animales sin hogar.', '🐾', TRUE, TRUE),
('Red de Ayuda', 'Organización ficticia — demo. Respondemos cuando una comunidad lo necesita.', '🤝', TRUE, TRUE);

INSERT INTO campanas (organizacion_id, titulo, descripcion, categoria, imagen, meta, recaudado, fecha_cierre, desglose_destino) VALUES
(1, 'Botiquines para comunidades rurales', 'Llevemos insumos de primeros auxilios a clínicas comunitarias con recursos limitados.', 'Salud', '🩺', 15000, 6300, '2027-02-15', '$10 = material de curación para una familia'),
(2, 'Mochilas llenas de futuro', 'Ayuda a equipar a estudiantes con útiles escolares para iniciar el ciclo con todo lo necesario.', 'Educación', '📚', 20000, 9250, '2027-01-30', '$10 = dos cuadernos y lápices para un estudiante'),
(3, 'Reforestemos nuestro barrio', 'Plantaremos árboles nativos y daremos seguimiento a su cuidado durante el primer año.', 'Medio ambiente', '🌿', 12000, 4800, '2027-03-20', '$10 = una plántula nativa y su protección'),
(4, 'Alimento y refugio para lomitos', 'Apoyemos con alimento, vacunas y espacios temporales seguros para perros rescatados.', 'Animales', '🐾', 18000, 11300, '2027-02-28', '$10 = una ración de alimento para un lomito'),
(5, 'Kits de emergencia familiar', 'Preparemos kits con agua, higiene y artículos básicos para familias tras una emergencia.', 'Emergencias', '🤝', 25000, 7500, '2027-01-20', '$10 = artículos de higiene para un kit familiar');
