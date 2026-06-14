import { Toaster } from "../components/ui/sonner";
import QueryProvider from "./query.provider";

interface Props {
  children: React.ReactNode;
}

const Providers = ({ children }: Props) => {
  return (
    <QueryProvider>
      <Toaster />
      {children}
    </QueryProvider>
  );
};

export default Providers;
