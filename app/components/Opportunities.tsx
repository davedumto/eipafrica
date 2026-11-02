import OpportunitiesTable from "./OpportunitiesTable";
import BrowseAllButton from "./BrowseAllButton";

export default function Opportunities() {
  return (
    <section className="sec light-2" id="opportunities">
      <div className="in">
        <div className="ohead">
          <div>
            <div className="eyebrow">OPPORTUNITIES</div>
            <h2>One standard format, so deals can be compared.</h2>
          </div>
          <BrowseAllButton />
        </div>
        <OpportunitiesTable />
      </div>
    </section>
  );
}
