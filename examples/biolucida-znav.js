goog.require('ol.Map');
goog.require('ol.View');
goog.require('ol.layer.Tile');
goog.require('ol.layer.Vector');
goog.require('ol.source.Biolucida');
goog.require('ol.source.Vector');


goog.require('ol.control.OverviewMap');
goog.require('ol.control.ScaleLine');
goog.require('ol.interaction');
goog.require('ol.interaction.DragRotateAndZoom');
goog.require('ol.layer.Tile');
goog.require('ol.source.OSM');


goog.require('ol.source.TileDebug');
goog.require('ol.tilegrid.XYZ');


var createMap = function(divId, viewToUse, rotate) {
    rotate = rotate || false;
    var mapOptions = {
        layers: [
            // new ol.layer.Tile({
            //   source: new ol.source.OSM()
            // })
        ],
        renderer: exampleNS.getRendererFromQueryString(),
        target: divId,
        view: viewToUse
    };
    if (rotate) {
        mapOptions.interactions = ol.interaction.defaults().extend([
            new ol.interaction.DragRotateAndZoom()
        ]);
    }
    return new ol.Map(mapOptions);
};


var styleFunction = (function() {
    return function(feature, resolution) {
        if (feature.get('hexcolor')) {
            return [new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: feature.get('hexcolor'),
                    width: 3
                }),
                fill: new ol.style.Fill({
                    color: 'rgba(0,0,0,0.0)'
                }),
                text: new ol.style.Text({
                    textAlign: "start",
                    textBaseline: "top",
                    font: "20px Arial",
                    text: feature.get('title'),
                    fill: new ol.style.Fill({
                        color: "#000000"
                    }),
                    stroke: new ol.style.Stroke({
                        color: feature.get('hexcolor'),
                        width: 3
                    }),
                    offsetX: 0,
                    offsetY: 0,
                    rotation: 0
                })
            })]
        } else {
            return [new ol.style.Style({
                fill: new ol.style.Fill({
                    color: 'rgba(255, 255, 255, 0.2)'
                }),
                stroke: new ol.style.Stroke({
                    color: 'ffffff',
                    width: 1
                }),
                image: new ol.style.Circle({
                    radius: 1,
                    fill: new ol.style.Fill({
                        color: '#ffffff'
                    })
                })
            })]
        }
    };
})();




// done map init, now create layers from a image to load
var example_biolucida_image = 'http://107.170.194.205:1234/wiley.biolucida.net/api/v1/image/1056';

// we keep the last layer in case we navigate in z
var image_layer = undefined;
var last_image_layer = undefined;
var image_z_index = 0;
var image_metadata = undefined;
var map = undefined;

function loadBiolucidaImage(metadata_url) {

    $.ajax({
        url: metadata_url,
        success: function(data) {

            var w = parseInt(data.levels[0].w);
            var h = parseInt(data.levels[0].h);
            var tsx = parseInt(data.tile_x);
            var tsy = parseInt(data.tile_y);

            // Calculate the number of resolutions - smallest fits into a tile
            var max = (w > h) ? w : h;
            var n = 1;

            while (max > 256) {
                max = Math.floor(max / 2);
                n++;
            }

            var result = {
                'max_size': {
                    w: w,
                    h: h
                },
                'tileSize': {
                    w: tsx,
                    h: tsy
                },
                'num_resolutions': n
            };

            result['url'] = "http://107.170.194.205:1234/wiley.biolucida.net/api/v1/tile/1056/";
            result['thumbnail'] = data.thumbnail;
            result['servermeta'] = data;

            // save this to load z later
            image_metadata = result;

            createViewer(result, image_z_index);

        }
    });
}

Array.prototype.contains = function(v) {
    for (var i = 0; i < this.length; i++) {
        if (this[i] === v) return true;
    }
    return false;
};

Array.prototype.unique = function() {
    var arr = [];
    for (var i = 0; i < this.length; i++) {
        if (!arr.contains(this[i])) {
            arr.push(this[i]);
        }
    }
    return arr;
};

var changeZCallback = function(z_to_load){

    var z_planes = parseInt(image_metadata.servermeta.focal_planes);
    var new_z = Math.round(z_to_load * z_planes);

    console.log("CHANGE Z", z_to_load, new_z);

    if(new_z <= 0) { new_z = 0; }

    var imageCenter = [image_metadata.max_size.w / 2, -image_metadata.max_size.h / 2];

    var projection = new ol.proj.Projection({
        code: 'ZOOMIFY',
        units: 'pixels',
        extent: [0, 0, image_metadata.max_size.w, image_metadata.max_size.h]
    });

    var zm = JSON.parse(image_metadata.servermeta.zoom_map);
    var zmu = zm.unique();

    var crossOrigin = 'anonymous';
    var image_source = new ol.source.Biolucida({
        url: image_metadata.url,
        zoommap: zmu,
        z_index: new_z,
        size: [image_metadata.max_size.w, image_metadata.max_size.h],
        crossOrigin: crossOrigin
    });


    // remove the bottom layer
    if (last_image_layer != undefined) {
        map.removeLayer(last_image_layer);
    }

    // make current layer the bottom layer
    if (image_layer != undefined){
        last_image_layer = image_layer;    
    }
    
    // initialize the new layer on top
    image_layer = new ol.layer.Tile({
        source: image_source,
        preload: 1
    });

    map.addLayer(image_layer);

}

function createViewer(metadata, base_z) {

    var imageCenter = [metadata.max_size.w / 2, -metadata.max_size.h / 2];

    var projection = new ol.proj.Projection({
        code: 'ZOOMIFY',
        units: 'pixels',
        extent: [0, 0, metadata.max_size.w, metadata.max_size.h]
    });

    var zm = JSON.parse(metadata.servermeta.zoom_map);
    var zmu = zm.unique();

    console.log(metadata);

    var z_spacing = parseInt(metadata.servermeta.focal_spacing);
    var z_planes = parseInt(metadata.servermeta.focal_planes);

    var crossOrigin = 'anonymous';
    var image_source = new ol.source.Biolucida({
        url: metadata.url,
        zoommap: zmu,
        z_index: base_z,
        size: [metadata.max_size.w, metadata.max_size.h],
        crossOrigin: crossOrigin
    });

    // remove the bottom layer
    if (last_image_layer != undefined) {
        map.removeLayer(last_image_layer);
    }

    // make current layer the bottom layer
    if (image_layer != undefined){
        last_image_layer = image_layer;    
    }
    
    // initialize the new layer on top
    image_layer = new ol.layer.Tile({
        source: image_source,
        preload: 1
    });


    var mainView = new ol.View({
        projection: projection,
        center: imageCenter,
        zoom: 1,
        maxZoom: metadata.num_resolutions 
    });

    map = createMap('map', mainView, false);

    map.addLayer(image_layer);
    // map.addLayer(debug_layer);
    map.setView(mainView);

    var overviewView = new ol.control.OverviewMap({
        maximized: true,
        minRatio: 0.25
    });

    map.addControl(overviewView);

    var scaleLineControl = new ol.control.ScaleLine({
        units: 'pixels'
    });
    map.addControl(scaleLineControl);


    if(z_planes > 1){

        var imageDepthControl = new ol.control.ImageDepthControl({
            z_planes: z_planes,
            z_index: base_z,
            callback: changeZCallback
        });

        map.addControl(imageDepthControl);
    }

}

loadBiolucidaImage(example_biolucida_image)
