import NavBar from '../components/layout/NavBar';
import Footer from '../components/layout/Footer';

function Sobre() {
  return (
    <>
      <NavBar />
      <div className="container">
      <section className="page-header">
        <h1>Sobre Nós</h1>
        <p>
          A HENRIQUE BARBER nasceu da paixão pelo estilo masculino e pela
          arte do corte e da barba. Nossa missão é oferecer um serviço
          premium que vá além do esperado, combinando técnica, atenção aos
          detalhes e um ambiente sofisticado.
        </p>
      </section>

      <section className="about-content">
        <div className="about-text">
          <h2>Nossa História</h2>
          <p>
            Fundada em [ano], a HENRIQUE BARBER começou como um sonho de
            oferecer cortes e barbas de alta qualidade em um ambiente
            exclusivo. Ao longo dos anos, nos tornamos referência no
            segmento premium, atendendo clientes que valorizam o estilo e
            o cuidado pessoal.
          </p>
          <h2>Nossa Missão</h2>
          <p>
            Oferecer um serviço de barbearia que una tradição e
            modernidade, garantindo que cada cliente saia com confiança
            e satisfação. Acreditamos que o corte certo e a barba bem
            cuidada são essenciais para o bem-estar e a autoestima.
          </p>
          <h2>Nossos Valores</h2>
          <ul className="values-list">
            <li>Excelência no atendimento</li>
            <li>Técnica apurada</li>
            <li>Ambiente sofisticado e acolhedor</li>
            <li>Respeito e atenção aos detalhes</li>
            <li>Inovação constante</li>
          </ul>
        </div>
        <div className="about-image">
          <img src="/assets/06_wallpaper.png" alt="Henrique Barber" />
        </div>
      </section>
      </div>
      <Footer />
    </>
  );
}

export default Sobre;