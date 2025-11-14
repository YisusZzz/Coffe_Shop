document.addEventListener("DOMContentLoaded", () => {
  // Variable global para acceder a los datos de los productos
  let productosDisponibles = [];

  // --- Efecto de máquina de escribir ---
  const typedTextSpan = document.getElementById("typed-subtitle");
  if (typedTextSpan) {
    const textArray = [
      "Descubre el sabor auténtico del café de origen michoacano.",
      "Cultivado con pasión, tostado con arte.",
    ];
    let textArrayIndex = 0,
      charIndex = 0,
      typingSpeed = 70,
      newTextDelay = 2000;
    function type() {
      if (charIndex < textArray[textArrayIndex].length) {
        typedTextSpan.textContent +=
          textArray[textArrayIndex].charAt(charIndex);
        charIndex++;
        setTimeout(type, typingSpeed);
      } else {
        setTimeout(erase, newTextDelay);
      }
    }
    function erase() {
      if (charIndex > 0) {
        typedTextSpan.textContent = textArray[textArrayIndex].substring(
          0,
          charIndex - 1
        );
        charIndex--;
        setTimeout(erase, typingSpeed / 2);
      } else {
        textArrayIndex = (textArrayIndex + 1) % textArray.length;
        setTimeout(type, typingSpeed + 1100);
      }
    }
    setTimeout(type, newTextDelay + 1000);
  }

  // --- Menú hamburguesa (Bulma) ---
  const $navbarBurgers = Array.prototype.slice.call(
    document.querySelectorAll(".navbar-burger"),
    0
  );
  $navbarBurgers.forEach((el) => {
    el.addEventListener("click", () => {
      const target = el.dataset.target;
      const $target = document.getElementById(target);
      el.classList.toggle("is-active");
      $target.classList.toggle("is-active");
    });
  });

  
  // LÓGICA DE PRODUCTOS Y CARRITO


  // --- Carga los productos desde la Base de Datos ---
  async function cargarProductos() {
    const contenedorProductos = document.querySelector("#productos .columns");
    if (!contenedorProductos) return;

    try {
      const response = await fetch("http://localhost:3000/api/productos");
      if (!response.ok)
        throw new Error(`Error del servidor: ${response.status}`);

      productosDisponibles = await response.json();
      contenedorProductos.innerHTML = "";

      productosDisponibles.forEach((producto) => {
        const productoHtml = `
                    <div class="column is-one-third product-item hidden-for-animation">
                        <div class="card product-card">
                            <div class="card-image"><figure class="image is-4by3"><img src="${
                              producto.url_imagen
                            }" alt="${
          producto.nombre
        }"></figure><div class="product-overlay"><button class="button is-primary is-rounded quick-view-button" data-product-id="${
          producto.producto_id
        }">Vista Rápida</button></div></div>
                            <div class="card-content"><p class="title is-4 product-name">${
                              producto.nombre
                            }</p><p class="subtitle is-6 product-roast">${
          producto.tipo_tostado
        }</p><div class="content product-description">${
          producto.descripcion_corta
        }</div><div class="level is-mobile mt-4"><div class="level-left"><p class="level-item product-price is-size-5 has-text-weight-bold">$${parseFloat(
          producto.precio
        ).toFixed(
          2
        )} MXN</p></div><div class="level-right"><button class="button is-primary is-rounded add-to-cart-button" data-product-id="${
          producto.producto_id
        }"><span class="icon"><i class="fas fa-shopping-cart"></i></span><span>Añadir</span></button></div></div></div>
                        </div>
                    </div>`;
        contenedorProductos.innerHTML += productoHtml;
      });

      iniciarFuncionalidadesDeProductos();
    } catch (error) {
      console.error("ERROR al cargar productos:", error);
      contenedorProductos.innerHTML =
        '<p class="has-text-centered has-text-white">Lo sentimos, no pudimos cargar nuestros cafés.</p>';
    }
  }

  // --- Inicializa todos los botones y animaciones de los productos ---
  function iniciarFuncionalidadesDeProductos() {
    document.querySelectorAll(".add-to-cart-button").forEach((button) => {
      button.addEventListener("click", (event) => {
        const productoId = parseInt(event.currentTarget.dataset.productId);
        agregarAlCarrito(productoId, 1);
      });
    });

    const modal = document.getElementById("product-quick-view-modal");
    document.querySelectorAll(".quick-view-button").forEach((button) => {
      button.addEventListener("click", (e) => {
        const productId = parseInt(e.currentTarget.dataset.productId);
        const product = productosDisponibles.find(
          (p) => p.producto_id === productId
        );
        if (product && modal) {
          document.getElementById("modal-product-name").textContent =
            product.nombre;
          document.getElementById("modal-product-roast").textContent =
            product.tipo_tostado;
          document.getElementById("modal-product-description").textContent =
            product.descripcion_larga;
          document.getElementById(
            "modal-product-price"
          ).textContent = `$${parseFloat(product.precio).toFixed(2)} MXN`;
          document.getElementById("modal-product-image").src =
            product.url_imagen;
          modal.dataset.currentProductId = product.producto_id;
          modal.classList.add("is-active");
        }
      });
    });

    const animatedElements = document.querySelectorAll(".hidden-for-animation");
    const scrollObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("show-after-animation");
            scrollObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    animatedElements.forEach((el) => scrollObserver.observe(el));
  }

  // --- Lógica del Modal (cerrar y añadir) ---
  const modal = document.getElementById("product-quick-view-modal");
  if (modal) {
    const closeModalButton = document.getElementById("close-modal");
    const modalBackground = modal.querySelector(".modal-background");
    closeModalButton.addEventListener("click", () =>
      modal.classList.remove("is-active")
    );
    modalBackground.addEventListener("click", () =>
      modal.classList.remove("is-active")
    );

    const modalAddToCartButton = document.getElementById(
      "modal-add-to-cart-button"
    );
    modalAddToCartButton.addEventListener("click", () => {
      const productId = parseInt(modal.dataset.currentProductId);
      const quantity = parseInt(
        document.getElementById("modal-product-quantity").value
      );
      if (productId && quantity > 0) {
        agregarAlCarrito(productId, quantity);
        modal.classList.remove("is-active");
      }
    });
  }

  // --- Lógica Central del Carrito ---
  function agregarAlCarrito(productoId, cantidad) {
    const productoAAgregar = productosDisponibles.find(
      (p) => p.producto_id === productoId
    );
    if (!productoAAgregar) return;

    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    const itemExistente = carrito.find((item) => item.id === productoId);

    if (itemExistente) {
      itemExistente.cantidad += cantidad;
    } else {
      carrito.push({
        id: productoAAgregar.producto_id,
        nombre: productoAAgregar.nombre,
        precio: productoAAgregar.precio,
        cantidad: cantidad,
      });
    }
    localStorage.setItem("carrito", JSON.stringify(carrito));
    actualizarContadorCarrito();
    const plural = cantidad > 1 ? "s" : "";
    mostrarNotificacion(
      `¡${cantidad} producto${plural} añadido${plural} al carrito!`
    );
  }

  function actualizarContadorCarrito() {
    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    const contador = document.getElementById("cart-counter");
    if (contador) {
      contador.style.display = totalItems > 0 ? "inline-block" : "none";
      contador.textContent = totalItems;
    }
  }

  // --- Función para mostrar Notificaciones ---
  function mostrarNotificacion(mensaje, esError = false) {
    const notificacion = document.createElement("div");
    notificacion.className = "toast-notification";
    if (esError) {
      notificacion.style.borderLeftColor = "#f14668";
    }
    notificacion.innerHTML = `<i class="fas ${
      esError ? "fa-exclamation-circle" : "fa-check-circle"
    }"></i> ${mensaje}`;
    document.body.appendChild(notificacion);
    setTimeout(() => notificacion.classList.add("show"), 100);
    setTimeout(() => {
      notificacion.classList.remove("show");
      notificacion.addEventListener("transitionend", () =>
        notificacion.remove()
      );
    }, 3000);
  }

  // --- Lógica para el Formulario de Suscripción ---
  const newsletterForm = document.getElementById("newsletter-form");
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const emailInput = document.getElementById("newsletter-email");
      const email = emailInput.value;

      try {
        const response = await fetch(
          "http://localhost:3000/api/suscripciones",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email }),
          }
        );
        const resultado = await response.json();
        if (!response.ok) {
          mostrarNotificacion(resultado.message || "Hubo un error.", true);
        } else {
          mostrarNotificacion(resultado.message);
          emailInput.value = "";
        }
      } catch (error) {
        console.error("Error de red al suscribirse:", error);
        mostrarNotificacion("No se pudo conectar al servidor.", true);
      }
    });
  }

  // --- EJECUCIÓN INICIAL ---
  cargarProductos();
  actualizarContadorCarrito();
});
