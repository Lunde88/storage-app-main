import { CardContent } from "../../ui/card";

type MainCardContentProps = {
  children?: React.ReactNode;
};

export default function MainCardContent({ children }: MainCardContentProps) {
  return <CardContent className="px-3">{children}</CardContent>;
}
