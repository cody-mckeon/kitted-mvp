import { ActivityLink } from "@/components/activity-link";
import { HomepageAnalytics } from "@/components/homepage-analytics";
import { activities } from "@/lib/catalog";

export default function Home() {
  return (
    <main>
      <HomepageAnalytics />
      <section className="hero">
        <p className="kicker">Outdoor gear, made simpler</p>
        <h1>Your outside<br /><em>starts here.</em></h1>
        <p className="hero-copy">Explore dependable gear for the way you want to get outdoors—no expertise required.</p>
        <a className="hero-cta" href="#activities">Browse activities <span>↓</span></a>
      </section>
      <section className="activity-section" id="activities">
        <div className="section-heading"><div><p className="kicker">Choose your adventure</p><h2>What are you getting into?</h2></div><p>Start with an activity and see gear from our local collection.</p></div>
        <div className="activity-grid">
          {activities.map((activity) => <ActivityLink key={activity.slug} {...activity} />)}
        </div>
      </section>
    </main>
  );
}
