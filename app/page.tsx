import Studio from "@/components/Studio";
import { deriveBands } from "@/lib/bands";
import { ROSTER, SEED_PASSAGE, rosterStats } from "@/lib/demo-data";

// Server component: the seed passage, the roster-derived bands and the roster
// stats are computed here (they touch lib/demo-data, which reads the filesystem)
// and handed to the client Studio as plain data. The tool opens on the tool.
export default function Home() {
  return (
    <main className="min-h-screen">
      <Studio
        initialSource={SEED_PASSAGE}
        bands={deriveBands(ROSTER)}
        rosterStats={rosterStats()}
      />
    </main>
  );
}
