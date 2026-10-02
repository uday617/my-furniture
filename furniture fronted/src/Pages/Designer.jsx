import { Link } from "react-router-dom";
import { StoreHeader } from "./Home";
import "./Designer.css";

const designers = [
  {
    name: "Kiki Goti",
    image: "https://www.deknudtmirrors.com/site/assets/files/17312/kiki_goti_portrait_wall_lights_photography_chelsie_craig.1920x0.jpg",
    position: "center 35%",
  },
  {
    name: "Paul Cocksedge",
    image: "https://www.deknudtmirrors.com/site/assets/files/17313/p_cocksedge_020_c_mark_cocksedge.1920x0.jpg",
    position: "center 55%",
  },
  {
    name: "Inge Rylant",
    image: "https://www.deknudtmirrors.com/site/assets/files/9761/interieur-inge-rylant-dennisdesmet-07.1920x0.jpg",
    position: "center 38%",
  },
  {
    name: "Jeffrey Huyghe",
    image: "https://www.deknudtmirrors.com/site/assets/files/10965/jeffrey-huyghe_color_01_2023_-_kopie.1920x0.jpg",
    position: "center 35%",
  },
  {
    name: "Maarten De Ceulaer",
    image: "https://www.deknudtmirrors.com/site/assets/files/10957/maarten_de_ceulaer.1920x0.jpg",
    position: "center 38%",
  },
  {
    name: "Louise Mertens",
    image: "https://www.deknudtmirrors.com/site/assets/files/1894/06_group_1_vertical_0421-3.1920x0.jpg",
    position: "center 35%",
  },
  {
    name: "Karim Rashid",
    image: "https://www.deknudtmirrors.com/site/assets/files/1896/9941adc8836cf306a6a15bfde2018c46.1920x0.png",
    position: "center 38%",
  },
  {
    name: "Studio Segers",
    image: "https://www.deknudtmirrors.com/site/assets/files/10956/studio_segers_color.1920x0.jpg",
    position: "center 35%",
  },
  {
    name: "James Van Vossel",
    image: "https://www.deknudtmirrors.com/site/assets/files/17524/1_portrait_james_van_vossel_c_alain_six.1920x0.jpg",
    position: "center 36%",
  },
  {
    name: "Design Studio Niruk",
    image: "https://www.deknudtmirrors.com/site/assets/files/17525/studio_niruk_nina_struve_140.1920x0.jpg",
    position: "center 35%",
  },
  {
    name: "Laurène Guarneri",
    image: "https://www.deknudtmirrors.com/site/assets/files/10966/portrait-laurene-guarneri-aureliensanchez.1920x0.jpg",
    position: "center 35%",
  },
  {
    name: "Julia Dozsa",
    image: "https://www.deknudtmirrors.com/site/assets/files/9760/julia_dozsa-portret_januari_2023_low.1920x0.jpg",
    position: "center 35%",
  },
  {
    name: "Beaverhausen",
    image: "https://www.deknudtmirrors.com/site/assets/files/10960/beaverhausen.1920x0.jpg",
    position: "center 35%",
  },
  {
    name: "Esther Everaert",
    image: "https://www.deknudtmirrors.com/site/assets/files/10962/esther_everaert.1920x0.jpg",
    position: "center 35%",
  },
  {
    name: "Sylvain Willenz",
    image: "https://www.deknudtmirrors.com/site/assets/files/10964/sylvain_willenz.1920x0.jpg",
    position: "center 35%",
  },
  {
    name: "Annemie Vanzieleghem",
    image: "https://www.deknudtmirrors.com/site/assets/files/9762/avz.1920x0.jpg",
    position: "center 35%",
  },
  {
    name: "Made",
    image: "https://www.deknudtmirrors.com/site/assets/files/9757/simon_desmet_timothy_macken_samen.1920x0.jpg",
    position: "center 35%",
  },
  {
    name: "Tibert Dhont",
    image: "https://www.deknudtmirrors.com/site/assets/files/9764/foto_tibert.1920x0.jpg",
    position: "center 35%",
  },
  {
    name: "Roberto Paoli",
    image: "https://www.deknudtmirrors.com/site/assets/files/9758/portrait_roberto_paoli.1920x0.jpg",
    position: "center 35%",
  },
];

function slugify(value) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function Designer() {
  return (
    <main className="designer-page">
      <StoreHeader variant="paper" />
      <section className="designer-directory" aria-labelledby="designer-title">
        <h1 id="designer-title">Designer</h1>
        <div className="designer-grid">
          {designers.map((designer, index) => (
            <article className="designer-card" key={designer.name}>
              <Link className="designer-card__image-link" to={`/neuheiten?designer=${slugify(designer.name)}&designerName=${encodeURIComponent(designer.name)}`} aria-label={`Browse designs by ${designer.name}`}>
                <img src={designer.image} alt={designer.name} style={{ objectPosition: designer.position }} loading={index < 4 ? "eager" : "lazy"} />
              </Link>
              <h2>{designer.name}</h2>
              <Link className="designer-card__profile" to={`/neuheiten?designer=${slugify(designer.name)}&designerName=${encodeURIComponent(designer.name)}`}>View profile</Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
