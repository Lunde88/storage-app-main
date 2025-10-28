import { Button } from "@/components/ui/button";

type CardButtonProps = {
  buttonText: string;
};

export default function CardButton({ buttonText }: CardButtonProps) {
  return (
    <Button className="w-full rounded-[48px] bg-[#2D3ECD] transition-all hover:bg-[#5A7B93]">
      {buttonText}
    </Button>
  );
}
