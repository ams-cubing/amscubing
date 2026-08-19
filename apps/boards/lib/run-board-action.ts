import { toast } from "sonner";

export async function runBoardAction<T>(
  action: () => Promise<T>,
  options?: {
    errorMessage?: string;
    onError?: (error: unknown) => void;
  },
): Promise<T | undefined> {
  try {
    return await action();
  } catch (error) {
    console.error(error);
    options?.onError?.(error);
    toast.error(
      options?.errorMessage ??
        (error instanceof Error
          ? error.message
          : "Algo salió mal. Inténtalo de nuevo."),
    );
    return undefined;
  }
}
