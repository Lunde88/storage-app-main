import { CardFooter } from "../../ui/card";

type MainCardFooterProps = {
  children: React.ReactNode;
};

export default function MainCardFooter({ children }: MainCardFooterProps) {
  return (
    <>
      <CardFooter className="px-3">{children}</CardFooter>
    </>
  );
}
