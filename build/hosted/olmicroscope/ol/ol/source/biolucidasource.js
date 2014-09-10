goog.provide('ol.source.Biolucida');

goog.require('goog.asserts');
goog.require('ol');
goog.require('ol.ImageTile');
goog.require('ol.TileCoord');
goog.require('ol.TileState');
goog.require('ol.TileUrlFunction');
goog.require('ol.dom');
goog.require('ol.proj');
goog.require('ol.source.TileImage');
goog.require('ol.tilegrid.Zoomify');
goog.require('ol.control.ImageDepthControl')

/**
 * @enum {string}
 */
ol.source.BiolucidaTierSizeCalculation = {
  DEFAULT: 'default',
  TRUNCATED: 'truncated'
};


/**
 * @classdesc
 * Layer source for tile data in Biolucida format.
 *
 * @constructor
 * @extends {ol.source.TileImage}
 * @param {olx.source.BiolucidaOptions=} opt_options Options.
 * @api
 */
ol.source.Biolucida = function(opt_options) {

  var options = goog.isDef(opt_options) ? opt_options : {};

   console.log(options);

  var size = options.size;
  var tierSizeCalculation = goog.isDef(options.tierSizeCalculation) ?
      options.tierSizeCalculation :
      ol.source.BiolucidaTierSizeCalculation.DEFAULT;

  var imageWidth = size[0];
  var imageHeight = size[1];
  var tierSizeInTiles = [];
  var tileSizeBase = 512;
  var tileSize = tileSizeBase;
  var zoommap = options.zoommap;
  var z_index = options.z_index;

  switch (tierSizeCalculation) {
    case ol.source.BiolucidaTierSizeCalculation.DEFAULT:
      while (imageWidth > tileSize || imageHeight > tileSize) {
        tierSizeInTiles.push([
          Math.ceil(imageWidth / tileSize),
          Math.ceil(imageHeight / tileSize)
        ]);
        tileSize += tileSize;
      }
      break;
    case ol.source.ZoomifyTierSizeCalculation.TRUNCATED:
      var width = imageWidth;
      var height = imageHeight;
      while (width > tileSize || height > tileSize) {
        tierSizeInTiles.push([
          Math.ceil(width / tileSize),
          Math.ceil(height / tileSize)
        ]);
        width >>= 1;
        height >>= 1;
      }
      break;
    default:
      goog.asserts.fail();
      break;
  }

  tierSizeInTiles.push([1, 1]);
  tierSizeInTiles.reverse();

  var resolutions = [1];
  var tileCountUpToTier = [0];

  var i, ii;

  for (i = 1, ii = tierSizeInTiles.length; i < ii; i++) {
    resolutions.push(1 << i);
    tileCountUpToTier.push(
        tierSizeInTiles[i - 1][0] * tierSizeInTiles[i - 1][1] +
        tileCountUpToTier[i - 1]
    );
  }

  resolutions.reverse();

  // 
  var tileGrid = new ol.tilegrid.Zoomify({
    resolutions: resolutions, 
    tileSize: tileSizeBase
  });

  var url = options.url;
  var tileUrlFunction = ol.TileUrlFunction.withTileCoordTransform(
      tileGrid.createTileCoordTransform({extent: [0, 0, size[0], size[1]]}),
      /**
       * @this {ol.source.TileImage}
       * @param {ol.TileCoord} tileCoord Tile Coordinate.
       * @param {number} pixelRatio Pixel ratio.
       * @param {ol.proj.Projection} projection Projection.
       * @return {string|undefined} Tile URL.
       */
      function(tileCoord, pixelRatio, projection) {
        if (goog.isNull(tileCoord)) {
          return undefined;
        } else {
          var tileCoordZ = tileCoord[0];
          var tileCoordX = tileCoord[1];
          var tileCoordY = tileCoord[2];
          
          if (zoommap.indexOf(tileCoordZ) > -1){
            // console.log(url + tileCoordZ + '-' + tileCoordX + '-' + tileCoordY + '-' + z_index);
            return url + tileCoordZ + '-' + tileCoordX + '-' + tileCoordY + '-' + z_index;
          }
          // console.log('SKIP', url + tileCoordZ + '-' + tileCoordX + '-' + tileCoordY + '-' + z_index);
          return '';
        }
      });

  goog.base(this, {
    attributions: options.attributions,
    crossOrigin: options.crossOrigin,
    logo: options.logo,
    tileClass: ol.source.BiolucidaTile_,
    tileGrid: tileGrid,
    tileUrlFunction: tileUrlFunction
  });

};
goog.inherits(ol.source.Biolucida, ol.source.TileImage);





/**
 * @constructor
 * @extends {ol.ImageTile}
 * @param {ol.TileCoord} tileCoord Tile coordinate.
 * @param {ol.TileState} state State.
 * @param {string} src Image source URI.
 * @param {?string} crossOrigin Cross origin.
 * @param {ol.TileLoadFunctionType} tileLoadFunction Tile load function.
 * @private
 */
ol.source.BiolucidaTile_ = function(
    tileCoord, state, src, crossOrigin, tileLoadFunction) {

  goog.base(this, tileCoord, state, src, crossOrigin, tileLoadFunction);

  /**
   * @private
   * @type {Object.<string,
   *                HTMLCanvasElement|HTMLImageElement|HTMLVideoElement>}
   */
  this.BiolucidaImageByContext_ = {};

};
goog.inherits(ol.source.BiolucidaTile_, ol.ImageTile);


/**
 * @inheritDoc
 */
ol.source.BiolucidaTile_.prototype.getImage = function(opt_context) {

  // var tileSize = ol.DEFAULT_TILE_SIZE;
  var tileSize = 512;

  var key = goog.isDef(opt_context) ? goog.getUid(opt_context).toString() : '';

  if (key in this.BiolucidaImageByContext_) {
    return this.BiolucidaImageByContext_[key];
  } else {

    var image = goog.base(this, 'getImage', opt_context);

    if (this.state == ol.TileState.LOADED) {
      if (image.width == tileSize && image.height == tileSize) {
        this.BiolucidaImageByContext_[key] = image;
        return image;
      } else {

        var context = ol.dom.createCanvasContext2D(tileSize, tileSize);
        context.drawImage(image, 0, 0);
        this.BiolucidaImageByContext_[key] = context.canvas;
        return context.canvas;
      }
    } else {
      return image;
    }
  }
};
