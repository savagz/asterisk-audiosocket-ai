var express = require('express');
var router = express.Router();

router.post('/', function(req, res, next) {
  const datos = req.body; 
  console.log(datos);
  // res.json({ messaje: "Response", text: "En el viento susurra la brisa,una historia de sol y de mar, el tiempo se pierde sin prisa, dejando su huella al pasar. Las hojas danzan calladas, susurros de un viejo rumor, las estrellas, en noches doradas, tejen sueños de luz y color. El río murmura su canto, laluna lo mira brillar, se funden el eco y el manto de sombras que van a danzar. Y en este instante sereno, donde el alma aprende a volar, descubro que todo es eterno, si el amor lo sabe nombrar." });
  res.json({ messaje: "Response", text: datos.message });
});

module.exports = router;
