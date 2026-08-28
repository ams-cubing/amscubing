import { toast } from "sonner";

export async function runBoardAction<T>(
  action: () => Promise<T>,
  options?: {
    errorMessage?: string;
    successMessage?: string;
    onError?: (error: unknown) => void;
    onSuccess?: (result: T) => void;
  },
): Promise<T | undefined> {
  try {
    const result = await action();
    if (options?.successMessage) {
      toast.success(options.successMessage);
    }
    options?.onSuccess?.(result);
    return result;
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
