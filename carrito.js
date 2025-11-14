document.addEventListener("DOMContentLoaded", () => {
  // --- Referencias a los elementos del Carrito ---
  const cartItemsContainer = document.getElementById("cart-items-container");
  const cartTotalElement = document.getElementById("cart-total");
  const checkoutButton = document.getElementById("checkout-button");

  // --- Referencias a los elementos del Modal de Confirmación ---
  const confirmModal = document.getElementById("confirm-modal");
  const confirmModalTotal = document.getElementById("confirm-modal-total");
  const confirmBuyButton = document.getElementById("confirm-buy-button");
  const confirmCancelButton = document.getElementById("confirm-cancel-button");
  const modalBackground = confirmModal.querySelector(".modal-background");

  // --- FUNCIÓN PARA CARGAR Y MOSTRAR LOS PRODUCTOS DEL CARRITO ---
  function cargarCarrito() {
    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    cartItemsContainer.innerHTML = "";
    let totalGeneral = 0;

    if (carrito.length === 0) {
      cartItemsContainer.innerHTML =
        '<tr><td colspan="5" class="has-text-centered">Tu carrito está vacío.</td></tr>';
      checkoutButton.disabled = true;
      cartTotalElement.textContent = "$0.00";
      return;
    }

    carrito.forEach((item, index) => {
      const subtotal = item.precio * item.cantidad;
      totalGeneral += subtotal;
      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td>${item.nombre}</td>
                <td>$${parseFloat(item.precio).toFixed(2)}</td>
                <td>${item.cantidad}</td>
                <td>$${subtotal.toFixed(2)}</td>
                <td><button class="button is-danger is-small delete-item-button" data-index="${index}">Eliminar</button></td>
            `;
      cartItemsContainer.appendChild(tr);
    });

    cartTotalElement.textContent = `$${totalGeneral.toFixed(2)}`;
    checkoutButton.disabled = false;
  }

  // --- FUNCIÓN PARA ELIMINAR UN PRODUCTO DEL CARRITO ---
  cartItemsContainer.addEventListener("click", (event) => {
    if (event.target.classList.contains("delete-item-button")) {
      const itemIndex = parseInt(event.target.dataset.index);
      let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
      carrito.splice(itemIndex, 1);
      localStorage.setItem("carrito", JSON.stringify(carrito));
      cargarCarrito();
      actualizarContadorCarritoGlobal();
    }
  });

  // --- LÓGICA DEL FLUJO DE COMPRA ---

  // 1. Cuando el usuario hace clic en "Confirmar Compra", ABRIMOS el modal.
  checkoutButton.addEventListener("click", () => {
    const total = cartTotalElement.textContent;
    confirmModalTotal.textContent = total; // Mostramos el total en el modal
    confirmModal.classList.add("is-active");
  });

  // 2. Si el usuario hace clic en "Sí, Comprar Ahora" dentro del modal.
  confirmBuyButton.addEventListener("click", async () => {
    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];

    if (carrito.length > 0) {
      try {
        const response = await fetch("http://localhost:3000/api/pedidos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ carrito: carrito }),
        });

        if (!response.ok) throw new Error("Error al procesar el pedido.");

        const resultado = await response.json();

        localStorage.removeItem("carrito"); // Limpiamos el carrito

        // Mostramos la notificación de éxito
        mostrarNotificacion(
          `¡Compra exitosa! Tu pedido #${resultado.pedidoId} está en camino.`
        );

        // Cerramos el modal y redirigimos después de un momento
        confirmModal.classList.remove("is-active");
        setTimeout(() => {
          window.location.href = "cafeS.html";
        }, 3500); // 3.5 segundos para que el usuario pueda leer la notificación
      } catch (error) {
        console.error("Error en la compra:", error);
        mostrarNotificacion("Hubo un problema al procesar tu compra.", true); // true para indicar error
        confirmModal.classList.remove("is-active");
      }
    }
  });

  // 3. Funciones para cerrar el modal de confirmación.
  confirmCancelButton.addEventListener("click", () =>
    confirmModal.classList.remove("is-active")
  );
  modalBackground.addEventListener("click", () =>
    confirmModal.classList.remove("is-active")
  );

  // --- FUNCIÓN PARA MOSTRAR LA NOTIFICACIÓN TOAST ---
  function mostrarNotificacion(mensaje, esError = false) {
    const notificacion = document.createElement("div");
    notificacion.className = "toast-notification";
    if (esError) {
      notificacion.style.borderLeftColor = "#f14668"; // Rojo para errores
    }
   
    const iconClass = esError ? "fa-exclamation-circle" : "fa-check-circle";
    notificacion.innerHTML = `<i class="fas ${iconClass}"></i> ${mensaje}`;

    document.body.appendChild(notificacion);

    setTimeout(() => notificacion.classList.add("show"), 100);
    setTimeout(() => {
      notificacion.classList.remove("show");
      notificacion.addEventListener("transitionend", () =>
        notificacion.remove()
      );
    }, 3000);
  }

  // --- FUNCIÓN GLOBAL PARA ACTUALIZAR EL CONTADOR ---
  function actualizarContadorCarritoGlobal() {
    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    const contador = document.getElementById("cart-counter");
    if (contador) {
      contador.style.display = totalItems > 0 ? "inline-block" : "none";
      contador.textContent = totalItems;
    }
  }

  // --- EJECUCIÓN INICIAL AL CARGAR LA PÁGINA ---
  cargarCarrito();
});
