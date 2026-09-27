-- Endurecimiento de seguridad (27/09/2026). Proyecto de Supabase compartido
-- entre Asiento Contable (clientes, movimientos) y Cierre de Caja (el resto).
-- Todo en una transacción: se aplica entero o no se aplica.
BEGIN;

-- 1) Asiento Contable: la base valida los datos, no solo la app.
ALTER TABLE movimientos
  ADD CONSTRAINT movimientos_debe_no_negativo CHECK (debe >= 0),
  ADD CONSTRAINT movimientos_haber_no_negativo CHECK (haber >= 0),
  -- cada movimiento es un Debe o un Haber, nunca los dos ni ninguno
  ADD CONSTRAINT movimientos_debe_o_haber CHECK ((debe > 0) <> (haber > 0)),
  ADD CONSTRAINT movimientos_referencia_largo CHECK (referencia IS NULL OR length(referencia) <= 200);

ALTER TABLE clientes
  ADD CONSTRAINT clientes_nombre_valido CHECK (length(btrim(nombre)) BETWEEN 1 AND 120),
  ADD CONSTRAINT clientes_telefono_largo CHECK (telefono IS NULL OR length(telefono) <= 40),
  ADD CONSTRAINT clientes_notas_largo CHECK (notas IS NULL OR length(notas) <= 1000);

-- El dueño se completa solo con el usuario de la sesión.
ALTER TABLE clientes ALTER COLUMN owner_id SET DEFAULT auth.uid();

-- 2) Políticas por usuario: mismas reglas, pero solo para usuarios con sesión
-- y con (select auth.uid()) para que no se recalcule en cada fila (recomendación
-- del linter de Supabase, 0003_auth_rls_initplan).
DROP POLICY clientes_own ON clientes;
CREATE POLICY clientes_own ON clientes
  FOR ALL TO authenticated
  USING ((select auth.uid()) = owner_id)
  WITH CHECK ((select auth.uid()) = owner_id);

DROP POLICY movimientos_own ON movimientos;
CREATE POLICY movimientos_own ON movimientos
  FOR ALL TO authenticated
  USING (cliente_id IN (SELECT id FROM clientes WHERE owner_id = (select auth.uid())))
  WITH CHECK (cliente_id IN (SELECT id FROM clientes WHERE owner_id = (select auth.uid())));

-- Cierre de Caja: mismas reglas, con (select auth.uid()).
DROP POLICY usuarios_caja_members_select ON usuarios_caja;
CREATE POLICY usuarios_caja_members_select ON usuarios_caja
  FOR SELECT TO authenticated USING (is_usuario_caja((select auth.uid())));

DROP POLICY ventas_usuarios_caja ON ventas;
CREATE POLICY ventas_usuarios_caja ON ventas
  FOR ALL TO authenticated
  USING (is_usuario_caja((select auth.uid()))) WITH CHECK (is_usuario_caja((select auth.uid())));

DROP POLICY gastos_usuarios_caja ON gastos;
CREATE POLICY gastos_usuarios_caja ON gastos
  FOR ALL TO authenticated
  USING (is_usuario_caja((select auth.uid()))) WITH CHECK (is_usuario_caja((select auth.uid())));

DROP POLICY cierres_usuarios_caja ON cierres;
CREATE POLICY cierres_usuarios_caja ON cierres
  FOR ALL TO authenticated
  USING (is_usuario_caja((select auth.uid()))) WITH CHECK (is_usuario_caja((select auth.uid())));

DROP POLICY medios_pago_select ON medios_pago;
CREATE POLICY medios_pago_select ON medios_pago
  FOR SELECT TO authenticated USING (is_usuario_caja((select auth.uid())));

DROP POLICY marcas_select ON marcas;
CREATE POLICY marcas_select ON marcas
  FOR SELECT TO authenticated USING (is_usuario_caja((select auth.uid())));

-- 3) Nadie sin sesión toca las tablas (las dos apps exigen login), y los
-- usuarios con sesión no tienen permisos que no usan (TRUNCATE saltea RLS).
REVOKE ALL ON clientes, movimientos, ventas, gastos, cierres, usuarios_caja, medios_pago, marcas FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON clientes, movimientos, ventas, gastos, cierres, usuarios_caja, medios_pago, marcas FROM authenticated;

-- 4) Funciones: solo usuarios con sesión, y la función de trigger no se expone.
REVOKE EXECUTE ON FUNCTION abrir_dia(DATE, NUMERIC) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION reabrir_dia(DATE) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION is_usuario_caja(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION bloquear_dia_cerrado() FROM PUBLIC, anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
