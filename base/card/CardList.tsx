type CardListProps = {
  children?: React.ReactNode;
};

export default function CardList({ children }: CardListProps) {
  return <ul className="space-y-3">{children}</ul>;
}
