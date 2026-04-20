export interface FetchInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

export interface FetchResult {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

export interface ContextMenuItem {
  id?: string;
  label?: string;
  type?: "normal" | "separator";
}

export interface ConfirmOptions {
  title?: string;
  kind?: "info" | "warning" | "error";
  okLabel?: string;
  cancelLabel?: string;
}
