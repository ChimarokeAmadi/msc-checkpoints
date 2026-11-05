// ITERATION 0: the original messy code (the starting point, kept exactly as found).
// It works, but it is full of code smells. They are listed in REPORT.md.
// Run with: node v0-messy/cart.js

var p = [] // products
var u = [] // users
var c = {} // carts
var tmp = 0
var DEBUG = false

function addP(n, pr, cat, w, s) {
  p.push({ n: n, pr: pr, cat: cat, w: w, s: s })
}

function newUser(n, t, e, ph, how, watch) {
  u.push({ n: n, t: t, e: e, ph: ph, how: how, watch: watch })
  c[n] = []
}

function add2cart(un, pn, q) {
  var x = null
  for (var i = 0; i < p.length; i++) {
    if (p[i].n == pn) {
      x = p[i]
    }
  }
  if (x == null) {
    console.log('ERROR product not found ' + pn)
    return
  }
  // check stock
  var inCart = 0
  for (var i = 0; i < c[un].length; i++) {
    if (c[un][i].n == pn) {
      inCart = c[un][i].q
    }
  }
  if (inCart + q > x.s) {
    console.log('Sorry ' + un + ', only ' + x.s + ' ' + pn + ' left in stock')
    return
  }
  var found = false
  for (var i = 0; i < c[un].length; i++) {
    if (c[un][i].n == pn) {
      c[un][i].q = c[un][i].q + q
      found = true
    }
  }
  if (found == false) {
    c[un].push({ n: pn, q: q })
  }
}

function checkout(un, code) {
  var usr
  for (var i = 0; i < u.length; i++) {
    if (u[i].n == un) usr = u[i]
  }
  var cart = c[un]
  if (cart.length == 0) {
    console.log('Cart is empty')
    return
  }
  console.log('--- Receipt for ' + usr.n + ' (' + usr.t + ') ---')
  var t = 0
  var w = 0
  for (var i = 0; i < cart.length; i++) {
    var pp
    for (var j = 0; j < p.length; j++) {
      if (p[j].n == cart[i].n) pp = p[j]
    }
    console.log(pp.n + ' x' + cart[i].q + ' @ ' + pp.pr.toFixed(2) + ' = ' + (pp.pr * cart[i].q).toFixed(2))
    t = t + pp.pr * cart[i].q
    w = w + pp.w * cart[i].q
  }
  console.log('Subtotal: ' + t.toFixed(2))
  // discounts
  var d = 0
  if (usr.t == 'student') {
    d = t * 0.1
  } else if (usr.t == 'vip') {
    d = t * 0.15
  } else {
    d = 0
  }
  var t2 = t - d
  if (code == 'SAVE10') {
    if (t2 >= 50) {
      d = d + 10
      t2 = t2 - 10
    } else {
      console.log('Coupon SAVE10 needs 50.00 after member discount')
    }
  }
  if (d > 0) console.log('Discount: -' + d.toFixed(2))
  // shipping
  var sh = 0
  if (t2 >= 100) {
    sh = 0
  } else {
    if (w <= 1) {
      sh = 4.5
    } else if (w <= 5) {
      sh = 8
    } else {
      sh = 8 + (w - 5) * 1.5
    }
  }
  console.log('Shipping: ' + sh.toFixed(2))
  var tax = t2 * 0.19
  console.log('Tax (19%): ' + tax.toFixed(2))
  var tot = t2 + tax + sh
  console.log('Total: ' + tot.toFixed(2) + ' TND')
  // update stock
  for (var i = 0; i < cart.length; i++) {
    for (var j = 0; j < p.length; j++) {
      if (p[j].n == cart[i].n) {
        p[j].s = p[j].s - cart[i].q
      }
    }
  }
  c[un] = []
  if (DEBUG) console.log(tmp)
}

// estimate shipping for a cart (copy of the code in checkout)
function shipEst(un) {
  var cart = c[un]
  var w = 0
  var t = 0
  for (var i = 0; i < cart.length; i++) {
    for (var j = 0; j < p.length; j++) {
      if (p[j].n == cart[i].n) {
        w = w + p[j].w * cart[i].q
        t = t + p[j].pr * cart[i].q
      }
    }
  }
  if (t >= 100) return 0
  if (w <= 1) {
    return 4.5
  } else if (w <= 5) {
    return 8
  } else {
    return 8 + (w - 5) * 1.5
  }
}

// old version, not used anymore
function checkoutOld(un) {
  var t = 0
  for (var i = 0; i < c[un].length; i++) {
    t = t + c[un][i].q * 10
  }
  return t
}

function setPrice(pn, np) {
  for (var i = 0; i < p.length; i++) {
    if (p[i].n == pn) {
      var old = p[i].pr
      p[i].pr = np
      if (np < old) {
        for (var k = 0; k < u.length; k++) {
          for (var m = 0; m < u[k].watch.length; m++) {
            if (u[k].watch[m] == pn) {
              if (u[k].how == 'email') {
                console.log('[EMAIL to ' + u[k].e + '] Hi ' + u[k].n + ', ' + pn + ' dropped from ' + old.toFixed(2) + ' to ' + np.toFixed(2) + ' TND!')
              } else if (u[k].how == 'sms') {
                console.log('[SMS to ' + u[k].ph + '] Hi ' + u[k].n + ', ' + pn + ' dropped from ' + old.toFixed(2) + ' to ' + np.toFixed(2) + ' TND!')
              }
            }
          }
        }
      }
    }
  }
}

// ---------- demo ----------
addP('Laptop', 1200, 'electronics', 2.2, 5)
addP('Headphones', 89.9, 'electronics', 0.3, 10)
addP('Notebook', 3.5, 'stationery', 0.2, 100)
addP('Coffee Mug', 12, 'kitchen', 0.4, 20)

newUser('Amara', 'student', 'amara@mail.com', '+216 20 111 111', 'email', ['Headphones'])
newUser('Tunde', 'regular', 'tunde@mail.com', '+216 20 222 222', 'sms', ['Headphones', 'Laptop'])
newUser('Bello', 'vip', 'bello@mail.com', '+216 20 333 333', 'email', ['Laptop'])

add2cart('Amara', 'Headphones', 1)
add2cart('Amara', 'Notebook', 4)
console.log('Estimated shipping for Amara: ' + shipEst('Amara').toFixed(2))
checkout('Amara', '')

add2cart('Tunde', 'Coffee Mug', 2)
add2cart('Tunde', 'Notebook', 3)
add2cart('Tunde', 'Laptop', 10)
add2cart('Tunde', 'Phone', 1)
checkout('Tunde', 'SAVE10')

add2cart('Bello', 'Laptop', 1)
add2cart('Bello', 'Coffee Mug', 1)
checkout('Bello', 'SAVE10')
checkout('Bello', '')

setPrice('Headphones', 74.9)
setPrice('Laptop', 1250)
setPrice('Laptop', 1099)
