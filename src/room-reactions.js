(() => {
  function create() {
    const object = name => document.getElementById('object-' + name);
    const cushion = [object('nest'), object('nest-rim')];
    const fabric = object('curtain'), leaves = object('plant');
    let bed = 0, curtain = 0, plant = 0;
    function paint(time) {
      for (const part of cushion) part.style.transform = 'scaleY(' + (1 - bed * .045) + ')';
      fabric.style.transform = 'skewX(' + Math.sin(time * 8) * curtain * 2 + 'deg)';
      leaves.style.transform = 'rotate(' + Math.sin(time * 10) * plant * 4 + 'deg)';
    }
    return {
      update(pose, dt, quiet) {
        const blend = 1 - Math.exp(-dt * 6);
        bed += ((pose.contact || 0) - bed) * blend;
        curtain += ((pose.target === 'sill' ? pose.touch || 0 : 0) - curtain) * blend;
        plant += ((pose.target === 'desk' ? pose.touch || 0 : 0) - plant) * blend;
        paint(quiet ? 0 : pose.elapsed);
        return {bed, curtain, plant};
      },
      reset() { bed = curtain = plant = 0; paint(0); }
    };
  }
  window.ROOM_REACTIONS = {create};
})();
