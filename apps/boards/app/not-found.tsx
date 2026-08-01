export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-2xl font-semibold">Tablero no encontrado</h1>
      <p className="text-muted-foreground">
        No existe o no tienes permiso para verlo.
      </p>
      <a href="/" className="text-sm underline underline-offset-4">
        Volver a mis tableros
      </a>
    </div>
  );
}
