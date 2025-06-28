"use client";

import { toast } from "sonner";
import { Component, ReactNode } from "react";

type GlobalErrorHandlerProps = {
  children: ReactNode;
};

type GlobalErrorHandlerState = {
  hasError: boolean;
  error?: Error;
};

export class GlobalErrorHandler extends Component<
  GlobalErrorHandlerProps,
  GlobalErrorHandlerState
> {
  constructor(props: GlobalErrorHandlerProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): GlobalErrorHandlerState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error("Произошла глобальная ошибка:", error, errorInfo);
    toast.error("Произошла ошибка", {
      description: error.message,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-8">
          <h1 className="text-2xl font-bold mb-4">Что-то пошло не так 😔</h1>
          <p className="text-muted-foreground mb-6">
            Мы уже работаем над устранением проблемы.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-white px-4 py-2 rounded-md"
          >
            Перезагрузить страницу
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
