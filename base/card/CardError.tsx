type CardErrorProps = {
  text: string;
};

export default function CardError({ text }: CardErrorProps) {
  return <div className="text-destructive text-sm">{text}</div>;
}
