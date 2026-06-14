import { Metadata } from "next";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    icons: `https://fribbels.github.io/hsr-optimizer/assets/icon/avatar/${id}.webp`,
  };
}

export default function CharacterSlugLayout({ children }: Props) {
  return <>{children}</>;
}
