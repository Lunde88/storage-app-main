type CardNoContentProps = {
  text: string;
};

export default function CardNoContent({ text }: CardNoContentProps) {
  return <div className="text-muted-foreground text-sm">{text}</div>;
}
